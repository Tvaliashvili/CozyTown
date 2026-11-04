// A sweep over the whole database: every table must have row security, and visitors (no account)
// must reach only what we expect. When a new feature adds a function for visitors on purpose,
// add its name to VISITOR_FUNCTIONS below. Run with: npm run test:db

const VISITOR_FUNCTIONS = [
  'can_edit_house', 'get_house', 'get_house_photos', 'get_street', 'get_town_map', 'house_of_path', 'is_admin', 'light_lantern',
]

export default async function run(db, { attempt, check }) {
  let r = await attempt(`select relname from pg_class
    where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity order by 1`)
  check('every table has row security on', r.result?.rows.length === 0, r.result?.rows.map((t) => t.relname).join(', '))

  r = await attempt(`select table_name || ' ' || privilege_type g from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public' order by 1`)
  const grants = r.result?.rows.map((row) => row.g) ?? []
  check('visitors can only read the streets table', grants.join(',') === 'streets SELECT', grants.join(', '))

  r = await attempt(`select proname from pg_proc
    where pronamespace = 'public'::regnamespace and has_function_privilege('anon', oid, 'execute') order by 1`)
  const reachable = r.result?.rows.map((row) => row.proname) ?? []
  const surprise = reachable.filter((name) => !VISITOR_FUNCTIONS.includes(name))
  check(`visitors can call only the ${VISITOR_FUNCTIONS.length} expected functions`, surprise.length === 0, 'also: ' + surprise.join(', '))

  r = await attempt(`select p.proname from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
      and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false) order by 1`)
  check('every security-definer function pins search_path', r.result?.rows.length === 0, r.result?.rows.map((f) => f.proname).join(', '))
}
