import type {Lang} from './words';

const locales:Record<Lang,string>={en:'en-IN',te:'te-IN'};
export function formatDate(value:string|Date,lang:Lang):string {
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return '—';
  return new Intl.DateTimeFormat(locales[lang],{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
}
export function formatDateTime(value:string|Date,lang:Lang):string {
  const date=value instanceof Date?value:new Date(value);
  if(Number.isNaN(date.getTime()))return '—';
  return new Intl.DateTimeFormat(locales[lang],{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
}
