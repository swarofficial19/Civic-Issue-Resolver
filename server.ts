import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { INITIAL_REPORTS } from "./src/data/seedData.js";
import { CivicReport, Department, Priority } from "./src/types.js";

// Shared memory state for civic reports
let reportsStore: CivicReport[] = [...INITIAL_REPORTS];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with enlarged limit for geotagged photo uploads
  app.use(express.json({ limit: "25mb" }));

  // --- API ROUTES ---

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Digital Nagarpalika India API", reportsCount: reportsStore.length });
  });

  // Fetch all reports
  app.get("/api/reports", (req, res) => {
    const { district, department, status, priority, searchQuery } = req.query;

    let filtered = [...reportsStore];

    if (district && district !== "All") {
      filtered = filtered.filter((r) => r.location.district === district);
    }
    if (department && department !== "All") {
      filtered = filtered.filter((r) => r.category === department);
    }
    if (status && status !== "All") {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (priority && priority !== "All") {
      filtered = filtered.filter((r) => r.priority === priority);
    }
    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.ticketNo.toLowerCase().includes(q) ||
          r.location.address.toLowerCase().includes(q)
      );
    }

    res.json(filtered);
  });

  // Get single report by ID or Ticket Number
  app.get("/api/reports/:id", (req, res) => {
    const report = reportsStore.find((r) => r.id === req.params.id || r.ticketNo.toUpperCase() === req.params.id.toUpperCase());
    if (!report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(report);
  });

  // Create new civic report
  app.post("/api/reports", (req, res) => {
    try {
      const body = req.body;
      if (!body.title || !body.location) {
        res.status(400).json({ error: "Title and location are required" });
        return;
      }

      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const districtRaw = body.location?.district || "DELHI";
      // Get abbreviation like MCD, BMC, BBMP, KMC, RMC, GHMC or first 3 chars
      const match = districtRaw.match(/\(([^)]+)\)/);
      const districtCode = match ? match[1].toUpperCase() : districtRaw.slice(0, 3).toUpperCase();
      const ticketNo = `${districtCode}-2026-${randomDigits}`;

      const newReport: CivicReport = {
        id: `rpt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ticketNo,
        title: body.title,
        category: body.category || "Sanitation",
        description: body.description || "",
        priority: body.priority || "MEDIUM",
        status: "Submitted",
        location: body.location,
        imageUrl: body.imageUrl || "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
        audioUrl: body.audioUrl || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slaHours: body.priority === "CRITICAL" ? 12 : body.priority === "HIGH" ? 24 : body.priority === "MEDIUM" ? 48 : 96,
        slaDueDate: new Date(
          Date.now() + (body.priority === "CRITICAL" ? 12 : body.priority === "HIGH" ? 24 : body.priority === "MEDIUM" ? 48 : 96) * 3600 * 1000
        ).toISOString(),
        isSlaOverdue: false,
        aiAnalysis: body.aiAnalysis,
        timeline: [
          {
            status: "Submitted",
            title: "Report Filed by Citizen",
            timestamp: new Date().toISOString(),
            note: body.aiAnalysis ? `AI Auto-routed to ${body.category} Department (${body.priority} priority)` : "Submitted via Citizen Portal",
          },
        ],
        reporterName: body.reporterName || "Civic Citizen",
        reporterPhone: body.reporterPhone || "",
        reporterEmail: body.reporterEmail || "",
        isAnonymous: body.isAnonymous || false,
      };

      reportsStore.unshift(newReport);
      res.status(201).json(newReport);
    } catch (err) {
      console.error("Error creating report:", err);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // Update report (status, assignment, resolution proof)
  app.patch("/api/reports/:id", (req, res) => {
    const index = reportsStore.findIndex((r) => r.id === req.params.id || r.ticketNo === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    const current = reportsStore[index];
    const { status, assignedOfficer, fieldWorker, proofOfResolution } = req.body;

    const updatedTimeline = [...current.timeline];

    if (status && status !== current.status) {
      current.status = status;
      let title = `Status changed to ${status}`;
      if (status === "Acknowledged") title = "Report Acknowledged by Control Room";
      if (status === "In Progress") title = "Work Ticket Assigned & In Progress";
      if (status === "Resolved") title = "Issue Resolved & Proof Verified";

      updatedTimeline.push({
        status,
        title,
        timestamp: new Date().toISOString(),
        note: proofOfResolution ? proofOfResolution.notes : undefined,
        actor: assignedOfficer ? assignedOfficer.name : "Municipal Admin",
      });
    }

    if (assignedOfficer) {
      current.assignedOfficer = assignedOfficer;
    }

    if (fieldWorker) {
      current.fieldWorker = fieldWorker;
    }

    if (proofOfResolution) {
      current.proofOfResolution = proofOfResolution;
      current.status = "Resolved";
    }

    current.timeline = updatedTimeline;
    current.updatedAt = new Date().toISOString();

    reportsStore[index] = current;
    res.json(current);
  });

  // Gemini API Endpoint for AI Auto-Routing & Scanning
  app.post("/api/classify", async (req, res) => {
    try {
      const { imageBase64, mimeType, description, location } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;

      // Rule-based fallback if API key is missing or invalid
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.warn("GEMINI_API_KEY is not set or default placeholder. Using smart heuristic fallback.");
        const text = (description || "").toLowerCase();

        let category: Department = "Sanitation";
        let priority: Priority = "MEDIUM";
        let summary = "Civic issue scanned and auto-categorized.";

        if (text.includes("water") || text.includes("pipe") || text.includes("leak") || text.includes("drain")) {
          category = "Water";
          priority = text.includes("burst") || text.includes("flood") || text.includes("major") ? "CRITICAL" : "HIGH";
          summary = "Water infrastructure issue detected. Requires immediate pipeline inspection.";
        } else if (text.includes("electric") || text.includes("spark") || text.includes("wire") || text.includes("pole") || text.includes("light")) {
          category = "Electrical";
          priority = text.includes("spark") || text.includes("naked") || text.includes("fire") ? "CRITICAL" : "HIGH";
          summary = "Electrical defect or streetlight outage identified. High shock risk area checked.";
        } else if (text.includes("pothole") || text.includes("road") || text.includes("crack") || text.includes("asphalt")) {
          category = "Roads";
          priority = text.includes("deep") || text.includes("crash") || text.includes("main road") ? "HIGH" : "MEDIUM";
          summary = "Road surface deformation detected. Safe traffic flow disruption logged.";
        } else if (text.includes("manhole") || text.includes("open") || text.includes("danger") || text.includes("accident")) {
          category = "Public Safety";
          priority = "CRITICAL";
          summary = "Critical public safety hazard. Open chamber or falling hazard detected.";
        } else {
          category = "Sanitation";
          priority = text.includes("garbage") || text.includes("smell") || text.includes("waste") ? "HIGH" : "MEDIUM";
          summary = "Solid waste or sanitation complaint identified. Scheduled for municipal truck dispatch.";
        }

        res.json({
          priority,
          category,
          confidence: 0.94,
          summary,
          suggestedDepartment: `${category} Department (${location?.district || "Municipal Corp"})`,
          actionSteps: [
            `Scan issue location coordinates at ${location?.address || "specified site"}`,
            `Auto-route ticket to ${category} Duty Officer`,
            `Dispatch field team within ${priority === "CRITICAL" ? "12" : priority === "HIGH" ? "24" : "48"} hours`,
          ],
        });
        return;
      }

      // Live Gemini 3.6 Flash Call via @google/genai SDK
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const contentsParts: any[] = [];

      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        contentsParts.push({
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: cleanBase64,
          },
        });
      }

      const promptText = `
Analyze this civic issue report for Digital Nagarpalika India - Municipal Corporation (${location?.district || "Municipal Zone"}).
Location address: "${location?.address || "Address provided by citizen"}".
User description: "${description || "No description provided"}".

Task:
1. Identify Category strictly as one of: ["Sanitation", "Electrical", "Roads", "Water", "Public Safety"].
2. Assign Priority strictly as one of: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].
3. Provide a concise 1-sentence technical summary of the civic flaw.
4. Suggest the appropriate municipal department/cell.
5. Provide 3 immediate action steps for the municipal officer.

Return JSON matching this schema:
{
  "category": "Sanitation" | "Electrical" | "Roads" | "Water" | "Public Safety",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "confidence": number between 0.8 and 1.0,
  "summary": "1 sentence technical summary",
  "suggestedDepartment": "Department name",
  "actionSteps": ["step1", "step2", "step3"]
}
`;

      contentsParts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: { parts: contentsParts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              priority: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              suggestedDepartment: { type: Type.STRING },
              actionSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["category", "priority", "summary", "suggestedDepartment", "actionSteps"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: any) {
      console.error("Gemini API classification error:", err);
      res.json({
        priority: "HIGH",
        category: "Sanitation",
        confidence: 0.9,
        summary: "Civic issue detected. Escalated for municipal review.",
        suggestedDepartment: "General Municipal Cell",
        actionSteps: ["Inspect site location", "Assign duty officer", "Issue work order"],
      });
    }
  });

  // AI Geocoding & Address Coordinate Detection Endpoint
  app.post("/api/geocode-address", async (req, res) => {
    const runLocalGeocode = (addrText: string) => {
      const lower = addrText.toLowerCase();
      let lat = 28.6139;
      let lng = 77.2090;
      let district = "Delhi (MCD)";

      if (lower.includes("mumbai") || lower.includes("dadar") || lower.includes("andheri") || lower.includes("bandra")) {
        lat = 19.0760; lng = 72.8777; district = "Mumbai (BMC)";
      } else if (lower.includes("bengaluru") || lower.includes("bangalore") || lower.includes("indiranagar") || lower.includes("koramangala")) {
        lat = 12.9716; lng = 77.5946; district = "Bengaluru (BBMP)";
      } else if (lower.includes("kolkata") || lower.includes("park street") || lower.includes("howrah")) {
        lat = 22.5726; lng = 88.3639; district = "Kolkata (KMC)";
      } else if (lower.includes("chennai") || lower.includes("t nagar") || lower.includes("adyar")) {
        lat = 13.0827; lng = 80.2707; district = "Chennai (GCC)";
      } else if (lower.includes("hyderabad") || lower.includes("jubilee") || lower.includes("hitech")) {
        lat = 17.3850; lng = 78.4867; district = "Hyderabad (GHMC)";
      } else if (lower.includes("bhopal") || lower.includes("arera") || lower.includes("mp nagar")) {
        lat = 23.2599; lng = 77.4126; district = "Bhopal (BMC)";
      } else if (lower.includes("indore") || lower.includes("vijay nagar")) {
        lat = 22.7196; lng = 75.8577; district = "Indore (IMC)";
      } else if (lower.includes("patna") || lower.includes("kankarbagh")) {
        lat = 25.5941; lng = 85.1376; district = "Patna (PMC)";
      } else if (lower.includes("jaipur") || lower.includes("pink city")) {
        lat = 26.9124; lng = 75.7873; district = "Jaipur (JMC)";
      } else if (lower.includes("lucknow") || lower.includes("gomti nagar")) {
        lat = 26.8467; lng = 80.9462; district = "Lucknow (LMC)";
      } else if (lower.includes("ranchi") || lower.includes("kanke") || lower.includes("doranda")) {
        lat = 23.3441; lng = 85.3096; district = "Ranchi (RMC)";
      } else if (lower.includes("ahmedabad")) {
        lat = 23.0225; lng = 72.5714; district = "Ahmedabad (AMC)";
      } else if (lower.includes("pune")) {
        lat = 18.5204; lng = 73.8567; district = "Pune (PMC)";
      } else if (lower.includes("surat")) {
        lat = 21.1702; lng = 72.8311; district = "Surat (SMC)";
      }

      return {
        address: addrText.trim(),
        lat,
        lng,
        district,
        state: "India",
        pincode: "110001",
        confidence: 0.88
      };
    };

    try {
      const { address } = req.body;
      if (!address || typeof address !== "string" || address.trim().length === 0) {
        res.status(400).json({ error: "Address text is required" });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        res.json(runLocalGeocode(address));
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const promptText = `
Given the following Indian address or landmark provided by a user:
"${address}"

Estimate accurate Geographic Coordinates (Latitude, Longitude) in India.
Also match it to the closest Indian Municipal Corporation (e.g., "Delhi (MCD)", "Mumbai (BMC)", "Bengaluru (BBMP)", "Kolkata (KMC)", "Chennai (GCC)", "Hyderabad (GHMC)", "Bhopal (BMC)", "Indore (IMC)", "Ranchi (RMC)", "Ahmedabad (AMC)", "Pune (PMC)", "Jaipur (JMC)", "Lucknow (LMC)", "Patna (PMC)").

Extract/estimate:
- lat (number, latitude e.g. 28.5672)
- lng (number, longitude e.g. 77.2435)
- formattedAddress (string, clean formatted street address/landmark)
- district (matching municipal corporation name)
- state (Indian state e.g. "Delhi NCR", "Maharashtra", "Karnataka", "Madhya Pradesh")
- pincode (6-digit Indian PIN code if identifiable)

Return JSON matching this schema:
{
  "lat": number,
  "lng": number,
  "formattedAddress": string,
  "district": string,
  "state": string,
  "pincode": string
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              formattedAddress: { type: Type.STRING },
              district: { type: Type.STRING },
              state: { type: Type.STRING },
              pincode: { type: Type.STRING },
            },
            required: ["lat", "lng", "district"],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      res.json({
        address: result.formattedAddress || address,
        lat: result.lat || 28.6139,
        lng: result.lng || 77.2090,
        district: result.district || "Delhi (MCD)",
        state: result.state || "India",
        pincode: result.pincode || "110001",
        confidence: 0.95
      });
    } catch (err: any) {
      console.warn("Geocoding API fallback triggered:", err?.message || err);
      res.json(runLocalGeocode(req.body.address || ""));
    }
  });

  // AI & OpenStreetMap Reverse Geocoding Endpoint (Coordinates to Word Street Address & Municipal Corp)
  app.post("/api/reverse-geocode", async (req, res) => {
    try {
      const { lat, lng } = req.body;
      if (typeof lat !== "number" || typeof lng !== "number") {
        res.status(400).json({ error: "Numeric lat and lng are required" });
        return;
      }

      const CITIES_GEO = [
        { name: "Delhi (MCD)", lat: 28.6139, lng: 77.2090, address: "Connaught Place, Inner Circle, New Delhi, Delhi" },
        { name: "Mumbai (BMC)", lat: 19.0760, lng: 72.8777, address: "Linking Road, Bandra West, Mumbai, Maharashtra" },
        { name: "Bengaluru (BBMP)", lat: 12.9716, lng: 77.5946, address: "100 Feet Road, Indiranagar, Bengaluru, Karnataka" },
        { name: "Kolkata (KMC)", lat: 22.5726, lng: 88.3639, address: "Park Street, Maidan, Kolkata, West Bengal" },
        { name: "Chennai (GCC)", lat: 13.0827, lng: 80.2707, address: "Anna Salai, T. Nagar, Chennai, Tamil Nadu" },
        { name: "Hyderabad (GHMC)", lat: 17.3850, lng: 78.4867, address: "Road No 36, Jubilee Hills, Hyderabad, Telangana" },
        { name: "Bhopal (BMC)", lat: 23.2599, lng: 77.4126, address: "MP Nagar Zone 1, Arera Colony, Bhopal, Madhya Pradesh" },
        { name: "Indore (IMC)", lat: 22.7196, lng: 75.8577, address: "AB Road, Vijay Nagar, Indore, Madhya Pradesh" },
        { name: "Patna (PMC)", lat: 25.5941, lng: 85.1376, address: "Boring Road, Kankarbagh, Patna, Bihar" },
        { name: "Jaipur (JMC)", lat: 26.9124, lng: 75.7873, address: "MI Road, Panch Batti, Jaipur, Rajasthan" },
        { name: "Lucknow (LMC)", lat: 26.8467, lng: 80.9462, address: "Gomti Nagar Main Road, Lucknow, Uttar Pradesh" },
        { name: "Ranchi (RMC)", lat: 23.3441, lng: 85.3096, address: "Main Road, Kanke, Ranchi, Jharkhand" },
        { name: "Ahmedabad (AMC)", lat: 23.0225, lng: 72.5714, address: "CG Road, Navrangpura, Ahmedabad, Gujarat" },
        { name: "Pune (PMC)", lat: 18.5204, lng: 73.8567, address: "FC Road, Shivajinagar, Pune, Maharashtra" },
        { name: "Surat (SMC)", lat: 21.1702, lng: 72.8311, address: "Ghod Dod Road, Athwa, Surat, Gujarat" },
      ];

      const getClosestCityInfo = (targetLat: number, targetLng: number) => {
        let closest = CITIES_GEO[0];
        let minDistance = Infinity;
        for (const city of CITIES_GEO) {
          const dist = Math.hypot(city.lat - targetLat, city.lng - targetLng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = city;
          }
        }
        return closest;
      };

      // 1. First try free OpenStreetMap Nominatim reverse geocoding
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const osmRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          {
            headers: { "User-Agent": "JanSevaPortal/1.0 (civic-issue-app)" },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (osmRes.ok) {
          const osmData = await osmRes.json();
          if (osmData && osmData.address) {
            const addr = osmData.address;
            const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || addr.residential || "";
            const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
            const state = addr.state || "";
            const postcode = addr.postcode || "";

            const parts = [road, city, state].filter(Boolean);
            const formattedWordsAddress = parts.length > 0 ? parts.join(", ") : osmData.display_name?.split(",").slice(0, 3).join(",");
            
            if (formattedWordsAddress && formattedWordsAddress.trim().length > 3 && !formattedWordsAddress.toLowerCase().includes("gps")) {
              const closest = getClosestCityInfo(lat, lng);
              res.json({
                address: formattedWordsAddress.trim(),
                district: closest.name,
                pincode: postcode || "110001"
              });
              return;
            }
          }
        }
      } catch (osmErr) {
        console.warn("OpenStreetMap Nominatim reverse geocode skipped:", osmErr);
      }

      // 2. Try Gemini AI Reverse Geocoding
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { "User-Agent": "aistudio-build" } },
          });

          const promptText = `
Given these GPS coordinates in India: Latitude ${lat}, Longitude ${lng}

Reverse geocode this precise location into words:
1. Provide a clean, human-readable street address, area name, landmark, and city in words (e.g. "Arera Colony, MP Nagar, Bhopal, Madhya Pradesh"). STRICTLY NO coordinates, degree symbols, or numbers formatted like "GPS Location" in the address string.
2. Match it to an Indian Municipal Corporation name (e.g. "Delhi (MCD)", "Mumbai (BMC)", "Bengaluru (BBMP)", "Kolkata (KMC)", "Chennai (GCC)", "Hyderabad (GHMC)", "Bhopal (BMC)", "Indore (IMC)", "Ranchi (RMC)", "Ahmedabad (AMC)", "Pune (PMC)", etc.).
3. Estimate 6-digit PIN code if possible.

Return JSON:
{
  "address": string,
  "district": string,
  "pincode": string
}
`;

          const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: promptText,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  address: { type: Type.STRING },
                  district: { type: Type.STRING },
                  pincode: { type: Type.STRING },
                },
                required: ["address", "district"],
              },
            },
          });

          const result = JSON.parse(response.text || "{}");
          if (result.address && !result.address.toLowerCase().includes("gps location")) {
            res.json({
              address: result.address,
              district: result.district || getClosestCityInfo(lat, lng).name,
              pincode: result.pincode || "110001"
            });
            return;
          }
        } catch (geminiErr: any) {
          console.warn("Gemini reverse geocode skipped:", geminiErr?.message || geminiErr);
        }
      }

      // 3. Guaranteed Landmark Word Fallback
      const closestCity = getClosestCityInfo(lat, lng);
      res.json({
        address: closestCity.address,
        district: closestCity.name,
        pincode: "110001"
      });
    } catch (err: any) {
      console.warn("Reverse geocoding ultimate fallback:", err?.message || err);
      const targetLat = req.body.lat || 23.2599;
      const targetLng = req.body.lng || 77.4126;
      const isBhopal = Math.hypot(23.2599 - targetLat, 77.4126 - targetLng) < 1.0;
      res.json({
        address: isBhopal ? "MP Nagar Zone 1, Arera Colony, Bhopal, Madhya Pradesh" : "Connaught Place, Inner Circle, New Delhi, Delhi",
        district: isBhopal ? "Bhopal (BMC)" : "Delhi (MCD)",
        pincode: "110001"
      });
    }
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
