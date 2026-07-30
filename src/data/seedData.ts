import { CivicReport, Officer, District } from '../types';

export const INITIAL_OFFICERS: Officer[] = [
  // Delhi NCR
  { id: 'off-1', name: 'Rajesh Sharma', designation: 'Executive Engineer (Water)', phone: '+91 94311 02812', department: 'Water', state: 'Delhi NCR', municipality: 'Delhi (MCD)', sector: 'South Delhi Water Supply' },
  { id: 'off-2', name: 'Suman Sinha', designation: 'Chief Sanitation Officer', phone: '+91 98351 44109', department: 'Sanitation', state: 'Delhi NCR', municipality: 'Delhi (MCD)', sector: 'Central Sanitation Cell' },
  { id: 'off-3', name: 'Amitabh Verma', designation: 'Superintending Engineer (Electrical)', phone: '+91 91223 88411', department: 'Electrical', state: 'Delhi NCR', municipality: 'Delhi (MCD)', sector: 'Power & Streetlight Infrastructure' },
  
  // Maharashtra
  { id: 'off-4', name: 'Vikram Deshmukh', designation: 'Zonal Road Infrastructure Engineer', phone: '+91 98200 45120', department: 'Roads', state: 'Maharashtra', municipality: 'Mumbai (BMC)', sector: 'Bandra-Andheri Western Sector' },
  { id: 'off-5', name: 'Aarti Kulkarni', designation: 'Chief Waste Management Officer', phone: '+91 98211 77203', department: 'Sanitation', state: 'Maharashtra', municipality: 'Mumbai (BMC)', sector: 'South Mumbai Solid Waste' },
  { id: 'off-6', name: 'Sanjay Patil', designation: 'Drainage & Public Safety Officer', phone: '+91 97654 32109', department: 'Public Safety', state: 'Maharashtra', municipality: 'Pune (PMC)', sector: 'Kothrud-Shivajinagar Sector' },

  // Madhya Pradesh
  { id: 'off-7', name: 'Anurag Chouhan', designation: 'Assistant Director (Swachh Cell)', phone: '+91 94250 88201', department: 'Sanitation', state: 'Madhya Pradesh', municipality: 'Bhopal (BMC)', sector: 'Arera & MP Nagar Sector' },
  { id: 'off-8', name: 'Meenakshi Malviya', designation: 'Executive Engineer (Water Works)', phone: '+91 94240 11920', department: 'Water', state: 'Madhya Pradesh', municipality: 'Bhopal (BMC)', sector: 'Upper Lake & City Pipeline' },
  { id: 'off-9', name: 'Sunil Agrawal', designation: 'Chief Electrical Engineer', phone: '+91 98260 55102', department: 'Electrical', state: 'Madhya Pradesh', municipality: 'Indore (IMC)', sector: 'Vijay Nagar Smart Light Grid' },

  // Karnataka
  { id: 'off-10', name: 'K. Venkatraman', designation: 'Zonal Sanitation Superintendent', phone: '+91 94440 12890', department: 'Sanitation', state: 'Karnataka', municipality: 'Bengaluru (BBMP)', sector: 'Indiranagar-Koramangala Zone' },
  { id: 'off-11', name: 'Deepa Hegde', designation: 'Road Pothole Maintenance Engineer', phone: '+91 98801 33405', department: 'Roads', state: 'Karnataka', municipality: 'Bengaluru (BBMP)', sector: 'Whitefield Tech Corridor' },

  // West Bengal
  { id: 'off-12', name: 'Subhashish Banerjee', designation: 'Chief Water Works Inspector', phone: '+91 98300 22104', department: 'Water', state: 'West Bengal', municipality: 'Kolkata (KMC)', sector: 'Park Street & Central Sector' },
  { id: 'off-13', name: 'Debolina Ghosh', designation: 'Public Health & Safety Officer', phone: '+91 98311 99201', department: 'Public Safety', state: 'West Bengal', municipality: 'Kolkata (KMC)', sector: 'Salt Lake Sector V' },

  // Tamil Nadu
  { id: 'off-14', name: 'R. Soundararajan', designation: 'Chief Stormwater & Safety Engineer', phone: '+91 94441 55601', department: 'Public Safety', state: 'Tamil Nadu', municipality: 'Chennai (GCC)', sector: 'T. Nagar & Adyar Flood Cell' },
  { id: 'off-15', name: 'Priya Mahato', designation: 'Assistant Road Engineer', phone: '+91 97714 55201', department: 'Roads', state: 'Tamil Nadu', municipality: 'Chennai (GCC)', sector: 'Central Highway Works' },

  // Telangana
  { id: 'off-16', name: 'Srinivas Rao', designation: 'Chief Electrical Officer', phone: '+91 98490 33412', department: 'Electrical', state: 'Telangana', municipality: 'Hyderabad (GHMC)', sector: 'Jubilee Hills & Hitech City' },
  { id: 'off-17', name: 'K. Laxmi Narayana', designation: 'Water Pipeline Division Head', phone: '+91 98480 66201', department: 'Water', state: 'Telangana', municipality: 'Hyderabad (GHMC)', sector: 'Secunderabad Water Works' },

  // Jharkhand & Bihar
  { id: 'off-18', name: 'Rakesh Kumar Hansda', designation: 'Public Safety Inspector', phone: '+91 93342 11928', department: 'Public Safety', state: 'Jharkhand', municipality: 'Ranchi (RMC)', sector: 'Doranda-Kanke Sector' },
  { id: 'off-19', name: 'Alok Singh', designation: 'Municipal Solid Waste Incharge', phone: '+91 94310 77102', department: 'Sanitation', state: 'Bihar', municipality: 'Patna (PMC)', sector: 'Kankarbagh Clean Cell' },

  // Uttar Pradesh & Gujarat
  { id: 'off-20', name: 'Manoj Tripathi', designation: 'Streetlight Infrastructure Head', phone: '+91 94150 22301', department: 'Electrical', state: 'Uttar Pradesh', municipality: 'Lucknow (LMC)', sector: 'Gomti Nagar Infrastructure' },
  { id: 'off-21', name: 'Chintan Patel', designation: 'Roads & Bridges Engineer', phone: '+91 98250 11920', department: 'Roads', state: 'Gujarat', municipality: 'Ahmedabad (AMC)', sector: 'Sabarmati & CG Road Sector' }
];

export const INITIAL_REPORTS: CivicReport[] = [];

export const INDIAN_MUNICIPALITIES: District[] = [
  'Delhi (MCD)',
  'Mumbai (BMC)',
  'Bengaluru (BBMP)',
  'Kolkata (KMC)',
  'Chennai (GCC)',
  'Hyderabad (GHMC)',
  'Ahmedabad (AMC)',
  'Pune (PMC)',
  'Surat (SMC)',
  'Jaipur (JMC)',
  'Lucknow (LMC)',
  'Kanpur (KNN)',
  'Nagpur (NMC)',
  'Visakhapatnam (GVMC)',
  'Indore (IMC)',
  'Thane (TMC)',
  'Bhopal (BMC)',
  'Pimpri-Chinchwad (PCMC)',
  'Patna (PMC)',
  'Vadodara (VMC)',
  'Ghaziabad (GNN)',
  'Ludhiana (MC)',
  'Agra (ANN)',
  'Nashik (NMC)',
  'Faridabad (MCF)',
  'Meerut (MNN)',
  'Rajkot (RMC)',
  'Kalyan-Dombivli (KDMC)',
  'Vasai-Virar (VVMC)',
  'Varanasi (VNN)',
  'Srinagar (SMC)',
  'Aurangabad / Chhatrapati Sambhajinagar (ASMC)',
  'Dhanbad (DMC)',
  'Amritsar (MC)',
  'Navi Mumbai (NMMC)',
  'Allahabad / Prayagraj (PNN)',
  'Howrah (HMC)',
  'Gwalior (GMC)',
  'Jabalpur (JMC)',
  'Coimbatore (CCMC)',
  'Vijayawada (VMC)',
  'Jodhpur (JMC)',
  'Madurai (MCC)',
  'Raipur (RMC)',
  'Kota (KMC)',
  'Chandigarh (MCC)',
  'Guwahati (GMC)',
  'Solapur (SMC)',
  'Hubli-Dharwad (HDMC)',
  'Bareilly (BNC)',
  'Moradabad (MNC)',
  'Mysore (MCC)',
  'Gurgaon / Gurugram (MCG)',
  'Noida / Greater Noida (GNIDA)',
  'Ranchi (RMC)',
  'Jamshedpur (JNAC)',
  'Dehradun (NN)',
  'Shimla (MC)',
  'Agartala (AMC)',
  'Bhubaneswar (BMC)',
  'Cuttack (CMC)',
  'Puducherry (PM)',
  'Panaji / Goa (CCP)',
  'Jammu (JMC)',
  'Imphal (IMC)',
  'Shillong (SMB)',
  'Aizawl (AMC)',
  'Gangtok (GMC)',
  'Itanagar (IMC)',
  'Leh & Ladakh (MC)',
  'Other Indian City / Municipality'
];


