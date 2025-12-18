import { w as slot, x as attr, y as ensure_array_like, z as bind_props } from './index-iIgwGB6r.js';
import { j as ssr_context, k as escape_html, l as fallback } from './context-BSiU6N_1.js';

function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}

function SvelteDevMenuBar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let spec = $$props["spec"];
    let homeLabel = fallback($$props["homeLabel"], "lush");
    let openMenuId = null;
    function isSubmenu(item) {
      return item.kind === "submenu";
    }
    let teardown = null;
    onDestroy(() => {
      teardown?.();
      teardown = null;
    });
    $$renderer2.push(`<nav class="sk-nav svelte-lt0wku" aria-label="Primary"><a class="home-link svelte-lt0wku" href="/"${attr("aria-label", homeLabel)}${attr("title", homeLabel)}>${escape_html(homeLabel)}</a> <div class="menus svelte-lt0wku"><!--[-->`);
    const each_array = ensure_array_like(spec.menus);
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let maybeMenu = each_array[$$index_1];
      if (isSubmenu(maybeMenu)) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="dropdown svelte-lt0wku"><button type="button" class="menu-button svelte-lt0wku" aria-haspopup="menu"${attr("aria-expanded", openMenuId === maybeMenu.id)}><span>${escape_html(maybeMenu.label)}</span> <svg class="chevron svelte-lt0wku" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.7 9.3a1 1 0 0 1 1.4 0L12 13.2l3.9-3.9a1 1 0 1 1 1.4 1.4l-4.6 4.6a1 1 0 0 1-1.4 0L6.7 10.7a1 1 0 0 1 0-1.4Z" fill="currentColor"></path></svg></button> `);
        if (openMenuId === maybeMenu.id) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="dropdown-content svelte-lt0wku" role="menu"${attr("aria-label", maybeMenu.label)}><div class="hover-menu svelte-lt0wku"><!--[-->`);
          const each_array_1 = ensure_array_like(maybeMenu.items);
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let item = each_array_1[$$index];
            if (item.kind === "separator") {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<div class="separator svelte-lt0wku" role="separator"></div>`);
            } else {
              $$renderer2.push("<!--[!-->");
              if (item.kind === "action") {
                $$renderer2.push("<!--[-->");
                $$renderer2.push(`<button type="button" class="menu-item svelte-lt0wku" role="menuitem"${attr("disabled", item.disabled === true, true)}>${escape_html(item.label)}</button>`);
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]-->`);
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]--></div></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div> <div class="spacer svelte-lt0wku"></div></nav>`);
    bind_props($$props, { spec, homeLabel });
  });
}
const LUSH_MENU_BAR = {
  menus: [
    {
      kind: "submenu",
      id: "help",
      label: "Help",
      items: [
        {
          kind: "action",
          id: "about",
          label: "About Lush",
          action: "about"
        }
      ]
    }
  ]
};
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    function getTauriEventApi() {
      const g = globalThis;
      if (!g.__TAURI__ || typeof g.__TAURI__ !== "object") return null;
      const rec = g.__TAURI__;
      const event = rec.event;
      if (!event || typeof event !== "object") return null;
      const listen = event.listen;
      if (typeof listen !== "function") return null;
      return event;
    }
    const tauriEventApi = getTauriEventApi();
    const isTauri = tauriEventApi != null;
    let unlisten = null;
    let teardownDomAbout = null;
    let teardownDomMenuAction = null;
    onDestroy(() => {
      unlisten?.();
      unlisten = null;
      teardownDomAbout?.();
      teardownDomAbout = null;
      teardownDomMenuAction?.();
      teardownDomMenuAction = null;
    });
    $$renderer2.push(`<div class="flex min-h-screen w-full flex-col">`);
    if (!isTauri) {
      $$renderer2.push("<!--[-->");
      SvelteDevMenuBar($$renderer2, { spec: LUSH_MENU_BAR, homeLabel: "lush" });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex-1 min-h-0 w-full"><!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-Co8KjrSs.js.map
