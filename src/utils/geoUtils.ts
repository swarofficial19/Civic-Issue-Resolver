export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi NCR',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

export const getStateForMunicipality = (district: string = '', address: string = ''): string => {
  const d = (district || '').toLowerCase();
  const a = (address || '').toLowerCase();

  if (d.includes('delhi') || a.includes('delhi') || a.includes('ncr')) return 'Delhi NCR';
  if (d.includes('mumbai') || d.includes('pune') || d.includes('thane') || d.includes('nagpur') || d.includes('nashik') || d.includes('kalyan') || d.includes('vasai') || d.includes('navi mumbai') || d.includes('solapur') || d.includes('pimpri') || a.includes('maharashtra') || a.includes('mumbai') || a.includes('pune')) return 'Maharashtra';
  if (d.includes('bengaluru') || d.includes('mysore') || d.includes('hubli') || a.includes('karnataka') || a.includes('bangalore')) return 'Karnataka';
  if (d.includes('bhopal') || d.includes('indore') || d.includes('gwalior') || d.includes('jabalpur') || a.includes('madhya pradesh') || a.includes('bhopal') || a.includes('indore')) return 'Madhya Pradesh';
  if (d.includes('ranchi') || d.includes('dhanbad') || d.includes('jamshedpur') || a.includes('jharkhand')) return 'Jharkhand';
  if (d.includes('kolkata') || d.includes('howrah') || a.includes('west bengal') || a.includes('calcutta')) return 'West Bengal';
  if (d.includes('chennai') || d.includes('coimbatore') || d.includes('madurai') || a.includes('tamil nadu')) return 'Tamil Nadu';
  if (d.includes('hyderabad') || a.includes('telangana')) return 'Telangana';
  if (d.includes('patna') || a.includes('bihar')) return 'Bihar';
  if (d.includes('lucknow') || d.includes('kanpur') || d.includes('varanasi') || d.includes('ghaziabad') || d.includes('noida') || d.includes('agra') || d.includes('meerut') || d.includes('bareilly') || d.includes('moradabad') || d.includes('prayagraj') || a.includes('uttar pradesh')) return 'Uttar Pradesh';
  if (d.includes('jaipur') || d.includes('jodhpur') || d.includes('kota') || a.includes('rajasthan')) return 'Rajasthan';
  if (d.includes('ahmedabad') || d.includes('surat') || d.includes('vadodara') || d.includes('rajkot') || a.includes('gujarat')) return 'Gujarat';
  if (d.includes('bhubaneswar') || d.includes('cuttack') || a.includes('odisha')) return 'Odisha';
  if (d.includes('chandigarh') || d.includes('ludhiana') || d.includes('amritsar') || a.includes('punjab')) return 'Punjab';
  if (d.includes('guwahati') || a.includes('assam')) return 'Assam';
  if (d.includes('shimla') || a.includes('himachal')) return 'Himachal Pradesh';
  if (d.includes('dehradun') || a.includes('uttarakhand')) return 'Uttarakhand';
  if (d.includes('raipur') || a.includes('chhattisgarh')) return 'Chhattisgarh';

  return 'Delhi NCR';
};
