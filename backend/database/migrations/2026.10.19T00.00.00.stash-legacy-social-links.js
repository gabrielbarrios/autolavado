'use strict';

/**
 * Step 1 of 2 of the social-links migration.
 *
 * `shared.contact-info` used to have three flat columns (facebook, instagram,
 * tiktok). They were replaced by the repeatable `socialLinks` component.
 * User migrations run BEFORE Strapi syncs the schema, so at this point the new
 * component table does not exist yet — and right after the sync the old
 * columns are gone. So this migration only stashes the old values in the core
 * store; `restoreLegacySocialLinks()` in src/index.ts (bootstrap, after the
 * sync) turns them into `shared.social-link` rows and deletes the stash.
 */
const TABLE = 'components_shared_contact_infos';
const STORE_KEY = 'autolavado.legacy_social_links';
const NETWORKS = ['facebook', 'instagram', 'tiktok'];

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(TABLE))) return;
    const hasColumns = await Promise.all(NETWORKS.map((n) => knex.schema.hasColumn(TABLE, n)));
    const present = NETWORKS.filter((_, i) => hasColumns[i]);
    if (present.length === 0) return;

    const rows = await knex(TABLE).select(['id', ...present]);
    const links = [];
    for (const row of rows) {
      for (const network of present) {
        const url = typeof row[network] === 'string' ? row[network].trim() : '';
        if (url) links.push({ contactInfoId: row.id, network, url });
      }
    }
    if (links.length === 0) return;

    await knex('strapi_core_store_settings').where({ key: STORE_KEY }).delete();
    await knex('strapi_core_store_settings').insert({
      key: STORE_KEY,
      value: JSON.stringify(links),
      type: 'object',
      environment: null,
      tag: null,
    });
  },

  async down() {},
};
