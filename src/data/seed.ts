import type { CampaignState } from '../types';

/**
 * Clean default campaign: the five Lines of Operation and nothing else.
 * No notional milestones, horizons, objectives or dependencies — the
 * campaign starts empty and real data is added by the user.
 */
export const seedState: CampaignState = {
  schemaVersion: 10,

  campaign: {
    id: 'campaign-1',
    name: 'TACEDGE Campaign',
    theme: '',
    vision: {
      statement: 'Build the trusted operating platform for complex, high-consequence field work.',
      note: 'An enduring direction, not an endpoint. The Lines of Operation continue through every horizon.',
    },
    activeHorizonId: '',
  },

  loos: [
    {
      id: 'loo-mv', number: 1, name: 'Market',
      description: 'Prove demand and secure reference customers.',
      owner: 'Mike', archived: false,
    },
    {
      id: 'loo-pt', number: 2, name: 'Product',
      description: 'Build and validate a trusted field-to-record platform.',
      owner: 'Mike', archived: false,
    },
    {
      id: 'loo-cr', number: 3, name: 'Commercial',
      description: 'Convert customer value into repeatable recurring revenue.',
      owner: 'Mike', archived: false,
    },
    {
      id: 'loo-sr', number: 4, name: 'Partnerships',
      description: 'Create leverage, capability and routes to market.',
      owner: 'Mike', archived: false,
    },
    {
      id: 'loo-cc', number: 5, name: 'Company',
      description: 'Build the team, runway and delivery system.',
      owner: 'Mike', archived: false,
    },
  ],
  looOrder: ['loo-mv', 'loo-pt', 'loo-cr', 'loo-sr', 'loo-cc'],

  horizons: [],
  objectives: [],
  milestones: [],
  dependencies: [],

  weekly: {
    outcomes: ['', '', ''],
    updatedAt: '',
  },
};
