/**
 * CMS Plugin — registers routes for the contributor and admin areas.
 *
 * /contribuir   → Public-facing contributor SPA (create/edit posts)
 * /dashboard    → Admin-only dashboard SPA (approve, publish, manage)
 *
 * Both use client-side routing for sub-pages.
 * The contributor area uses Docusaurus Layout (navbar/footer).
 * The dashboard has its own standalone dark layout.
 */
module.exports = function adminCmsPlugin() {
  return {
    name: 'admin-cms',
    async contentLoaded({actions}) {
      // Contributor area — friendly UI for all authenticated users
      actions.addRoute({
        path: '/contribuir',
        component: '@site/src/components/Contribute/index',
        exact: false,
      });

      // Admin dashboard — full management for admins
      actions.addRoute({
        path: '/dashboard',
        component: '@site/src/components/Admin/index',
        exact: false,
      });
    },
  };
};
