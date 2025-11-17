// Schema overrides for Dataverse logical names → runtime entity set and attribute names.
// Seeded from local metadata JSON files in `docs/dataverse/`.
const overrides: Record<string, any> = {
  // Knowledge article entity definition
  e365_knowledgearticle: {
    logicalName: 'e365_knowledgearticle',
    entitySetName: 'e365_knowledgearticles',
    primaryId: 'e365_knowledgearticleid',
    primaryName: 'e365_name',
    // common navigation / lookup property names used by the UI
    navigationProperties: {
      subject: 'e365_knowledgearticlesubject',
      businessFunction: 'e365_businessfunction',
    },
    // common scalar fields used by the UI
    fields: {
      tagsText: 'tagsText',
      title: 'title'
    }
  }
};

export default overrides;
