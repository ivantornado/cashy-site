// Building texts, loaded from data/base-city.json.

const res = await fetch(new URL('../data/base-city.json', import.meta.url));
if (!res.ok) throw new Error('Could not load data/base-city.json (' + res.status + ')');
// INFO[id] = { name, tag, text, withCashy, link, linkLabel, play }. Every field except id is optional.
const INFO = {};
for (const item of await res.json()) INFO[item.id] = { name: '', tag: '', text: '', ...item };

export { INFO };
