// Conservative MYR-oriented cashbook parser. Missing/ambiguous fields stay blank.
// Receipt Scanner's editable vendor/date/total workflow inspired this module;
// its UK VAT rules and loose decimal-insertion heuristic are intentionally not used.
export function parseReceipt(raw) {
  const text = String(raw || "").slice(0, 20000);
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const result = {merchant:"",date:"",amount:"",currency:"",category:"Other",warnings:[]};
  result.merchant = (lines.slice(0, 6).find(line => /[A-Za-z\u4e00-\u9fff]/.test(line) && !/^(?:tel|phone|www|http|tax invoice|receipt|invoice|date|cashier|order|gst|sst)\b/i.test(line) && !/^\d/.test(line)) || "").slice(0,120);
  const valid = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number(iso.slice(0,4)) >= 2000 && Number(iso.slice(0,4)) <= 2100 && !Number.isNaN(Date.parse(iso)) && new Date(iso + "T00:00:00Z").toISOString().slice(0,10) === iso;
  const isoMatch = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) { const iso = isoMatch[1]+"-"+isoMatch[2].padStart(2,"0")+"-"+isoMatch[3].padStart(2,"0"); if(valid(iso)) result.date=iso; }
  if (!result.date) {
    const m = text.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2}|\d{2})\b/);
    if (m) {const iso=(m[3].length===2?"20"+m[3]:m[3])+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");if(valid(iso)) result.date=iso;if(Number(m[1])<=12 && Number(m[2])<=12)result.warnings.push("Numeric date interpreted as day/month/year. Please check it.");}
  }
  if (!result.date) {
    const m=text.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20\d{2})\b/i);
    if(m){const month=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(m[2].toLowerCase())+1;const iso=m[3]+"-"+String(month).padStart(2,"0")+"-"+m[1].padStart(2,"0");if(valid(iso))result.date=iso;}
  }
  const totalLines=lines.filter(line=>/\b(?:grand\s*total|total|amount\s*(?:due|paid)|balance\s*due|jumlah)\b/i.test(line) && !/sub[\s-]*total|tendered|change|discount|tax total|total tax|cash received/i.test(line));
  totalLines.sort((a,b)=>Number(/grand\s*total|amount\s*due/i.test(b))-Number(/grand\s*total|amount\s*due/i.test(a)));
  for(const line of totalLines){const tail=line.replace(/^.*?(?:grand\s*total|total|amount\s*(?:due|paid)|balance\s*due|jumlah)\b/i,"");const amounts=[...tail.matchAll(/(?:^|[^\d.,-])(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?![\d.,])/g)];if(amounts.length!==1)continue;const amount=amounts[0][1].replace(/,/g,"");if(Number(amount)>0 && Number(amount)<=99999999.99){result.amount=Number(amount).toFixed(2);break;}}
  if (/\bMYR\b|\bRM\s*\d/i.test(text)) result.currency="MYR";
  else if (/\bSGD\b|S\$/i.test(text)) result.currency="SGD";
  else if (/\bUSD\b|US\$/i.test(text)) result.currency="USD";
  else if (/\bEUR\b|€/i.test(text)) result.currency="EUR";
  else if (/\bGBP\b|£/i.test(text)) result.currency="GBP";
  if (/packag|bottle|label|container/i.test(text)) result.category="Packaging";
  else if (/ingredient|flour|sugar|chili|material/i.test(text)) result.category="Materials";
  else if (/advertis|printing|flyer/i.test(text)) result.category="Marketing";
  else if (/taxi|grab|petrol|transport|parking/i.test(text)) result.category="Transport";
  for(const field of ["merchant","date","amount"])if(!result[field])result.warnings.push(field[0].toUpperCase()+field.slice(1)+" was not identified. Enter it before saving.");
  return result;
}
