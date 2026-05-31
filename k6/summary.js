function fmt(ms) {
  if (ms === undefined || ms === null) return 'N/A';
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function fmtRate(rate) {
  if (rate === undefined || rate === null) return 'N/A';
  return `${(rate * 100).toFixed(2)}%`;
}

export function generateMarkdown(scenario, data) {
  const req  = data.metrics.http_req_duration;
  const fail = data.metrics.http_req_failed;
  const reqs = data.metrics.http_reqs;
  const err  = data.metrics.errors;

  const p50  = req  ? fmt(req.values['p(50)'])  : 'N/A';
  const p90  = req  ? fmt(req.values['p(90)'])  : 'N/A';
  const p95  = req  ? fmt(req.values['p(95)'])  : 'N/A';
  const p99  = req  ? fmt(req.values['p(99)'])  : 'N/A';
  const avg  = req  ? fmt(req.values.avg)        : 'N/A';
  const max  = req  ? fmt(req.values.max)        : 'N/A';
  const rps  = reqs ? reqs.values.rate.toFixed(2) : 'N/A';
  const errR = err  ? fmtRate(err.values.rate)   : 'N/A';
  const failR = fail ? fmtRate(fail.values.rate)  : 'N/A';

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  let md = `# k6 ${scenario} Test 결과\n\n`;
  md += `> 측정 시각: ${now} UTC\n\n`;
  md += `## 응답 시간\n\n`;
  md += `| 지표 | 결과 |\n`;
  md += `|------|------|\n`;
  md += `| avg  | ${avg} |\n`;
  md += `| p50  | ${p50} |\n`;
  md += `| p90  | ${p90} |\n`;
  md += `| p95  | ${p95} |\n`;
  md += `| p99  | ${p99} |\n`;
  md += `| max  | ${max} |\n\n`;
  md += `## 처리량 & 에러\n\n`;
  md += `| 지표 | 결과 |\n`;
  md += `|------|------|\n`;
  md += `| 처리량 (req/s) | ${rps} |\n`;
  md += `| 에러율         | ${errR} |\n`;
  md += `| http 실패율    | ${failR} |\n\n`;

  // 커스텀 메트릭 (Trend 타입)
  const customTrends = ['create_duration', 'update_duration', 'cascade_duration'];
  const found = customTrends.filter(k => data.metrics[k]);
  if (found.length > 0) {
    md += `## 커스텀 메트릭\n\n`;
    md += `| 메트릭 | avg | p95 | max |\n`;
    md += `|--------|-----|-----|-----|\n`;
    for (const k of found) {
      const m = data.metrics[k];
      md += `| ${k} | ${fmt(m.values.avg)} | ${fmt(m.values['p(95)'])} | ${fmt(m.values.max)} |\n`;
    }
    md += '\n';
  }

  return md;
}
