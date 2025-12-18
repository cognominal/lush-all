import { json } from '@sveltejs/kit';

const GET = async ({ locals }) => {
  if (!locals.user) {
    return json({ authenticated: false });
  }
  return json({
    authenticated: true,
    user: locals.user
  });
};

export { GET };
//# sourceMappingURL=_server.ts-D6ff-pgM.js.map
