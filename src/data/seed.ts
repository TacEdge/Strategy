import type { CampaignState } from '../types';

/**
 * Clean default campaign: the three Lines of Operation and nothing else.
 * No notional milestones or horizons — the campaign starts empty and
 * real data is added by the user.
 */
export const seedState: CampaignState = {
  schemaVersion: 13,

  campaign: {
    id: 'campaign-1',
    name: 'TACEDGE Campaign',
    vision: 'Build the trusted operating platform for complex, high-consequence field work.',
  },

  loos: [
    {
      id: 'loo-pt', number: 1, name: 'Product',
      description: 'Design and build the product.',
      owner: 'Mike', archived: false,
    },
    {
      id: 'loo-cr', number: 2, name: 'Commercial',
      description: 'Win contracts and agreements with customers.',
      owner: 'Mike', archived: false,
    },
    {
      id: 'loo-cc', number: 3, name: 'Company',
      description: 'Run the company: brand, marketing, team and runway.',
      owner: 'Mike', archived: false,
    },
  ],
  looOrder: ['loo-pt', 'loo-cr', 'loo-cc'],

  horizons: [],
  milestones: [],

  weekly: {
    outcomes: ['', '', ''],
    updatedAt: '',
  },
};
