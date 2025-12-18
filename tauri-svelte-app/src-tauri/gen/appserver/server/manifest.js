const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png"]),
	mimeTypes: {".png":"image/png"},
	_: {
		client: {start:"_app/immutable/entry/start.DJTfUXXC.js",app:"_app/immutable/entry/app.OYUqDd8j.js",imports:["_app/immutable/entry/start.DJTfUXXC.js","_app/immutable/chunks/jsAauxxX.js","_app/immutable/chunks/DYu2Xxxm.js","_app/immutable/entry/app.OYUqDd8j.js","_app/immutable/chunks/DYu2Xxxm.js","_app/immutable/chunks/ou-dlvaJ.js","_app/immutable/chunks/D4zezPoh.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-9MRfq-Vh.js')),
			__memo(() => import('./chunks/1-Dx5_a05u.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/api/me",
				pattern: /^\/api\/me\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D6ff-pgM.js'))
			},
			{
				id: "/auth/callback",
				pattern: /^\/auth\/callback\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B8v-s1k1.js'))
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-WC9EybQD.js'))
			},
			{
				id: "/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BJ-dbYhO.js'))
			}
		],
		prerendered_routes: new Set(["/"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set(["/"]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
