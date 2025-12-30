async function check() {
  const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
  const data = await response.json();
  const geometries = data.objects.countries.geometries;
  
  console.log('Total geometries:', geometries.length);
  
  // 소말리아 주변 ID 검색
  const targets = geometries.filter(g => {
    const id = String(g.id);
    return id === '706' || id === '906' || id === '158' || id.startsWith('70') || id === '706';
  });
  
  console.log('Matched geometries:', JSON.stringify(targets, null, 2));
}

check();

