import type {
  CampaignState, Milestone, MilestoneStatus, Confidence,
} from '../types';

const M = (
  id: string,
  looId: string,
  title: string,
  targetDate: string,
  status: MilestoneStatus,
  confidence: Confidence,
  owner: string,
  progress: number,
  extra: Partial<Milestone> = {},
): Milestone => ({
  id,
  title,
  looId,
  targetDate,
  status,
  confidence,
  owner,
  progress,
  purpose: '',
  strategicImportance: '',
  successCriteria: [],
  risks: [],
  decisions: [],
  tasks: [],
  evidence: [],
  notes: '',
  nextBestAction: '',
  founderAction: false,
  major: false,
  history: [
    { id: `${id}-h0`, at: '2026-06-01T09:00:00', summary: 'Milestone created in campaign seed.' },
  ],
  ...extra,
});

export const seedState: CampaignState = {
  schemaVersion: 2,

  campaign: {
    id: 'campaign-1',
    name: 'TACEDGE Campaign',
    theme: 'Prove the Narrow V2 Model',
    vision: {
      statement: 'Build the trusted operating platform for complex, high-consequence field work.',
      note: 'An enduring direction, not an endpoint. The Lines of Operation continue through every horizon.',
    },
    activeHorizonId: 'hz-1',
    primaryConstraint: 'Insufficiently defined enterprise pilot scope',
    notToday: [
      'Website visual refinement',
      'Additional work-type mock-ups',
      'Broad industry research',
      'Non-urgent administration',
    ],
  },

  loos: [
    {
      id: 'loo-mv', number: 1, name: 'Market Validation',
      description: 'Prove that credible customers validate the core workflow and will deploy it on live work.',
      owner: 'Mike', role: 'main-effort', archived: false,
    },
    {
      id: 'loo-pt', number: 2, name: 'Product & Technology',
      description: 'Make the narrow V2 anchoring workflow production-ready and proven on live projects.',
      owner: 'Technical Lead', role: 'supporting', archived: false,
    },
    {
      id: 'loo-cr', number: 3, name: 'Commercial & Revenue',
      description: 'Validate pilot pricing and convert pilots into ongoing paid use.',
      owner: 'Mike', role: 'supporting', archived: false,
    },
    {
      id: 'loo-sr', number: 4, name: 'Strategic Reach',
      description: 'Establish credible pathways into major contractors and enterprise channels.',
      owner: 'Mike', role: 'sustaining', archived: false,
    },
    {
      id: 'loo-cc', number: 5, name: 'Company Capability',
      description: 'Secure the technical leadership, delivery discipline and runway to deliver reliably.',
      owner: 'Mike', role: 'sustaining', archived: false,
    },
  ],
  looOrder: ['loo-mv', 'loo-pt', 'loo-cr', 'loo-sr', 'loo-cc'],

  horizons: [
    {
      id: 'hz-1',
      date: '2026-12-31',
      theme: 'Prove the Narrow Model',
      integratedState:
        'By 31 December 2026, TACEDGE has validated a narrow production-ready ground-engineering product through credible paid deployments, demonstrated measurable customer value, secured the technical capability to deliver reliably and established a viable path toward recurring enterprise revenue.',
      status: 'on-track',
      confidence: 'medium',
      assumptions: [
        'Fulton Hogan remains willing to run a defined pilot this year.',
        'The narrow anchoring scope holds without major expansion.',
        'A technical lead can be secured before the pilot build peaks.',
      ],
      risks: [
        'Pilot is scheduled before product readiness is proven in the field.',
        'Founder capacity is the single point of failure across three LOOs.',
      ],
      assessment:
        'The horizon holds if the Fulton Hogan pilot is agreed by mid September and the technical lead is secured. Both are live this quarter.',
      archived: false,
    },
    {
      id: 'hz-2',
      date: '2027-06-30',
      theme: 'Establish Repeatable Deployment',
      integratedState:
        'By 30 June 2027, TACEDGE deploys the validated workflow repeatably across multiple customers, with a working pilot-to-subscription motion and a qualified enterprise channel. This state is partially developed and will firm up as Horizon 1 evidence lands.',
      status: 'forming',
      confidence: 'low',
      assumptions: [
        'Horizon 1 delivers at least one referenceable deployment.',
        'Renewal economics support a repeatable pricing model.',
      ],
      risks: [
        'Repeatability depends on capability hires that are not yet planned in detail.',
      ],
      assessment:
        'Partially developed. Objectives are directional until Horizon 1 evidence confirms the model.',
      archived: false,
    },
  ],

  objectives: [
    // Horizon 1
    { id: 'obj-h1-mv', horizonId: 'hz-1', looId: 'loo-mv', confidence: 'medium',
      statement: 'Three credible customers have validated the core workflow, with at least one referenceable deployment.' },
    { id: 'obj-h1-pt', horizonId: 'hz-1', looId: 'loo-pt', confidence: 'medium',
      statement: 'The narrow V2 anchoring workflow is production-ready and proven on a live project.' },
    { id: 'obj-h1-cr', horizonId: 'hz-1', looId: 'loo-cr', confidence: 'medium',
      statement: 'Pilot pricing is validated and at least one customer has converted into ongoing paid use.' },
    { id: 'obj-h1-sr', horizonId: 'hz-1', looId: 'loo-sr', confidence: 'low',
      statement: 'TACEDGE has established a credible pathway into a major contractor or enterprise channel.' },
    { id: 'obj-h1-cc', horizonId: 'hz-1', looId: 'loo-cc', confidence: 'medium',
      statement: 'Technical leadership, delivery discipline and sufficient runway are in place.' },
    // Horizon 2 — partially developed
    { id: 'obj-h2-mv', horizonId: 'hz-2', looId: 'loo-mv', confidence: 'low',
      statement: 'Five customers use the workflow on live projects; two are referenceable at enterprise level.' },
    { id: 'obj-h2-pt', horizonId: 'hz-2', looId: 'loo-pt', confidence: 'low',
      statement: 'The configurable engine supports a second work type without bespoke engineering.' },
    { id: 'obj-h2-cr', horizonId: 'hz-2', looId: 'loo-cr', confidence: 'low',
      statement: 'The pilot-to-subscription motion is validated and a sales motion v1 is running.' },
    { id: 'obj-h2-sr', horizonId: 'hz-2', looId: 'loo-sr', confidence: 'low',
      statement: 'An enterprise channel opportunity is validated with a named partner.' },
    { id: 'obj-h2-cc', horizonId: 'hz-2', looId: 'loo-cc', confidence: 'low',
      statement: 'Delivery cadence is stable and runway extends beyond the horizon.' },
  ],

  milestones: [
    // ------------------------------------------------ Market Validation
    M('ms-mv-1', 'loo-mv', 'Hunter Civil workflow review', '2026-03-12', 'complete', 'high', 'Mike', 100, {
      major: true,
      purpose: 'Confirm the anchoring workflow matches how Hunter Civil actually runs anchoring work.',
      strategicImportance: 'First structured field validation of the narrow V2 model with a production customer.',
      successCriteria: ['Hunter Civil confirms the workflow reflects real site practice.', 'Gaps are logged and scoped.'],
      evidence: [{ id: 'ev-mv1-1', text: 'Review session notes and workflow gap list filed.', date: '2026-03-12' }],
      notes: 'Completed on site in Napier. Two workflow gaps folded into the V2 scope.',
    }),
    M('ms-mv-2', 'loo-mv', 'Design partnership formalised', '2026-05-28', 'complete', 'high', 'Mike', 100, {
      purpose: 'Convert informal goodwill into a named design partnership with agreed input cadence.',
      strategicImportance: 'Gives V2 development a standing source of field truth.',
      successCriteria: ['Partnership terms agreed in writing.', 'Monthly review cadence in place.'],
      evidence: [{ id: 'ev-mv2-1', text: 'Partnership one-pager signed.', date: '2026-05-28' }],
    }),
    M('ms-mv-3', 'loo-mv', 'Fulton Hogan pilot agreed', '2026-09-15', 'active', 'medium', 'Mike', 45, {
      major: true, founderAction: true,
      purpose: 'Secure a defined, dated pilot commitment from Fulton Hogan on live anchoring work.',
      strategicImportance:
        'The pivotal Main Effort milestone. A defined pilot converts interest into a condition every other LOO can plan against: product gets a real deployment target, commercial gets a pricing test, reach gets an enterprise reference path.',
      successCriteria: [
        'Fulton Hogan agrees to a defined pilot with a named project and start window.',
        'Pilot scope fits the narrow V2 anchoring workflow.',
        'Success measures are agreed before the pilot starts.',
      ],
      risks: [
        { id: 'rk-mv3-1', text: 'Pilot decision drifts past the September window and compresses delivery.', severity: 'high' },
        { id: 'rk-mv3-2', text: 'Scope creep beyond the narrow anchoring workflow.', severity: 'medium' },
      ],
      decisions: [
        { id: 'dc-mv3-1', text: 'Confirm which Fulton Hogan project hosts the pilot.', due: '2026-08-15', resolved: false },
      ],
      tasks: [
        { id: 'tk-mv3-1', title: 'Draft one-page pilot scope for customer review', done: false, owner: 'Mike', week: 'Week of 20 Jul' },
        { id: 'tk-mv3-2', title: 'Confirm pilot sponsor and decision path', done: false, owner: 'Mike', week: 'Week of 27 Jul' },
        { id: 'tk-mv3-3', title: 'Agree success measures with site engineer', done: false, owner: 'Mike', week: 'Week of 3 Aug' },
        { id: 'tk-mv3-4', title: 'Walk through V2 workflow with pilot team', done: true, owner: 'Mike' },
      ],
      nextBestAction: 'Draft a one-page pilot scope for customer review.',
      notes: 'Sponsor is engaged. The open question is which project hosts the pilot.',
      actions: [
        {
          id: 'act-mv3-90', block: 90,
          text: 'Draft the Fulton Hogan pilot scope.',
          completion: 'A one-page pilot proposal is ready for customer review and requests agreement on scope, ownership, success measures and timing.',
        },
        {
          id: 'act-mv3-45', block: 45,
          text: 'Outline the four decisions required in the Fulton Hogan pilot proposal.',
          completion: 'Pilot workflow, customer owner, success measures and commercial commitment are each defined in one sentence, ready for the next full work block.',
        },
        {
          id: 'act-mv3-30', block: 30,
          text: 'List the open questions blocking the pilot scope and give each an owner and a date.',
          completion: 'Every open question has an owner and a date.',
        },
      ],
      unlocks: [
        'Customer review can be scheduled',
        'Pilot pricing can be finalised',
        'Product configuration requirements can be confirmed',
        'Technical delivery capacity can be assessed',
      ],
      consequenceOfDelay:
        'The pilot decision drifts past the September window, compressing delivery and putting the 31 December Market Validation objective at risk.',
    }),
    M('ms-mv-4', 'loo-mv', 'First live V2 design partner', '2026-11-16', 'future', 'medium', 'Mike', 0, {
      major: true,
      purpose: 'A design partner runs the V2 workflow on live production work, not a trial environment.',
      strategicImportance: 'Moves validation from opinion to observed use on real work.',
      successCriteria: ['V2 used on live anchoring work for a full work package.', 'Field feedback captured weekly.'],
    }),
    M('ms-mv-5', 'loo-mv', 'Referenceable enterprise proof', '2027-02-26', 'future', 'low', 'Mike', 0, {
      major: true,
      purpose: 'One enterprise customer agrees to act as a named reference.',
      strategicImportance: 'Unlocks enterprise conversations that currently stall on proof.',
      successCriteria: ['Customer agrees to reference calls and a written case summary.'],
    }),
    M('ms-mv-6', 'loo-mv', 'Three validated customers', '2027-06-15', 'future', 'low', 'Mike', 0, {
      major: true,
      purpose: 'Three credible customers have validated the core workflow on live work.',
      strategicImportance: 'The Horizon 2 entry condition for repeatable deployment.',
      successCriteria: ['Three customers on live work.', 'At least one referenceable deployment.'],
    }),

    // ------------------------------------------------ Product & Technology
    M('ms-pt-1', 'loo-pt', 'Narrow V2 scope locked', '2026-04-30', 'complete', 'high', 'Mike', 100, {
      major: true,
      purpose: 'Fix the V2 build to the narrow anchoring workflow and defend the boundary.',
      strategicImportance: 'Everything downstream prices, builds and sells against this scope.',
      successCriteria: ['Scope document agreed.', 'Out-of-scope list published.'],
      evidence: [{ id: 'ev-pt1-1', text: 'V2 scope document v1.0 agreed.', date: '2026-04-30' }],
    }),
    M('ms-pt-2', 'loo-pt', 'Anchoring workflow validated', '2026-08-10', 'active', 'high', 'Technical Lead', 70, {
      purpose: 'The V2 anchoring workflow passes structured validation against design partner practice.',
      strategicImportance: 'Confirms the product matches field reality before hardening begins.',
      successCriteria: ['Configure, Capture and Confirm validated end to end with the design partner.'],
      tasks: [
        { id: 'tk-pt2-1', title: 'Close the two Hunter Civil workflow gaps', done: true, owner: 'Technical Lead' },
        { id: 'tk-pt2-2', title: 'Run end-to-end validation session', done: false, owner: 'Technical Lead', week: 'Week of 3 Aug' },
      ],
      actions: [
        {
          id: 'act-pt2-45', block: 45,
          text: 'Prepare the Hunter Civil workflow questions for Thursday.',
          completion: 'The question list covers both workflow gaps and the end-to-end validation sequence.',
        },
      ],
    }),
    M('ms-pt-3', 'loo-pt', 'Field-ready anchoring workflow', '2026-09-30', 'at-risk', 'medium', 'Technical Lead', 35, {
      major: true,
      purpose: 'The anchoring workflow works reliably in field conditions: offline, gloves, glare, interruptions.',
      strategicImportance: 'The pilot cannot start until this condition is true.',
      successCriteria: ['Offline capture proven on site.', 'No data loss across a full shift.'],
      risks: [
        { id: 'rk-pt3-1', text: 'Field hardening depends on the technical lead hire, which is blocked.', severity: 'high' },
      ],
      nextBestAction: 'Re-plan field hardening around current capacity until the technical lead lands.',
    }),
    M('ms-pt-4', 'loo-pt', 'Live pilot deployment', '2026-11-02', 'future', 'medium', 'Technical Lead', 0, {
      major: true,
      purpose: 'The V2 workflow deployed and in daily use on the agreed pilot project.',
      strategicImportance: 'The proof event of the campaign. Production-ready anchoring workflow deployed on a live project.',
      successCriteria: ['Deployed on the pilot project.', 'Used daily by the site team without TACEDGE hand-holding.'],
    }),
    M('ms-pt-5', 'loo-pt', 'Production reliability established', '2027-01-29', 'future', 'medium', 'Technical Lead', 0, {
      purpose: 'The deployed workflow runs for a full quarter without a critical failure.',
      strategicImportance: 'Reliability is the licence to sell repeatable deployment.',
      successCriteria: ['One quarter live with no critical incident.', 'Support load measured and sustainable.'],
    }),
    M('ms-pt-6', 'loo-pt', 'Configurable engine v1', '2027-05-31', 'future', 'low', 'Technical Lead', 0, {
      major: true,
      purpose: 'The workflow engine supports a second work type through configuration, not bespoke build.',
      strategicImportance: 'The technical basis of Horizon 2 repeatability.',
      successCriteria: ['Second work type configured without code changes to the core.'],
    }),

    // ------------------------------------------------ Commercial & Revenue
    M('ms-cr-1', 'loo-cr', 'Pilot pricing model agreed', '2026-08-31', 'active', 'medium', 'Mike', 55, {
      major: true, founderAction: true,
      purpose: 'A pilot price and structure that a contractor can approve without escalation.',
      strategicImportance: 'The Fulton Hogan pilot cannot be proposed without a price attached.',
      successCriteria: ['Pilot price, term and conversion terms documented.', 'Sanity-checked with the design partner.'],
      decisions: [
        { id: 'dc-cr1-1', text: 'Fixed pilot fee or per-project pricing.', due: '2026-08-08', resolved: false },
      ],
      tasks: [
        { id: 'tk-cr1-1', title: 'Model pilot economics at three price points', done: true, owner: 'Mike' },
        { id: 'tk-cr1-2', title: 'Test pricing structure with design partner', done: false, owner: 'Mike', week: 'Week of 27 Jul' },
      ],
      nextBestAction: 'Test the pilot pricing structure with the design partner.',
      actions: [
        {
          id: 'act-cr1-60', block: 60,
          text: 'Test the pilot pricing structure with the design partner.',
          completion: 'The design partner has reacted to the three price points and a preferred structure is chosen.',
        },
        {
          id: 'act-cr1-30', block: 30,
          text: 'Write the one-paragraph rationale for each of the three pilot price points.',
          completion: 'Each price point has a defensible rationale ready to test with the design partner.',
        },
      ],
      consequenceOfDelay:
        'The Fulton Hogan proposal goes out without a price, or waits for one.',
    }),
    M('ms-cr-2', 'loo-cr', 'First paid V2 pilot', '2026-10-30', 'future', 'medium', 'Mike', 0, {
      major: true,
      purpose: 'A customer pays for a V2 pilot under the agreed pricing model.',
      strategicImportance: 'First revenue against the narrow model. Payment is validation money cannot fake.',
      successCriteria: ['Invoice issued and paid for a defined pilot.'],
    }),
    M('ms-cr-3', 'loo-cr', 'First paid renewal', '2027-02-15', 'future', 'low', 'Mike', 0, {
      major: true,
      purpose: 'A pilot customer renews into ongoing paid use.',
      strategicImportance: 'The first evidence that pilots convert. The economics of the whole model hang on this.',
      successCriteria: ['Renewal agreed at or above pilot pricing.', 'Customer value evidence captured.'],
    }),
    M('ms-cr-4', 'loo-cr', 'Pilot-to-subscription model validated', '2027-04-30', 'future', 'low', 'Mike', 0, {
      purpose: 'The pilot-to-subscription conversion path is documented and has worked at least twice.',
      strategicImportance: 'Turns one-off wins into a repeatable commercial motion.',
      successCriteria: ['Two conversions through the same documented path.'],
    }),
    M('ms-cr-5', 'loo-cr', 'Sales motion v1', '2027-06-30', 'future', 'low', 'Mike', 0, {
      major: true,
      purpose: 'A documented, repeatable sales motion from introduction to paid pilot.',
      strategicImportance: 'The Horizon 2 commercial objective. Without it, growth stays founder-bound.',
      successCriteria: ['Motion documented.', 'One deal run through it end to end.'],
    }),

    // ------------------------------------------------ Strategic Reach
    M('ms-sr-1', 'loo-sr', 'One NZ pathway established', '2026-06-12', 'complete', 'high', 'Mike', 100, {
      purpose: 'One credible route into NZ ground-engineering delivery, working and warm.',
      strategicImportance: 'Proof that reach can be built deliberately rather than opportunistically.',
      successCriteria: ['Named pathway with an active sponsor.'],
      evidence: [{ id: 'ev-sr1-1', text: 'Hunter Civil relationship active on production work.', date: '2026-06-12' }],
    }),
    M('ms-sr-2', 'loo-sr', 'Major contractor introduction', '2026-08-21', 'active', 'medium', 'Mike', 60, {
      purpose: 'A warm, sponsored introduction into a tier-one contractor.',
      strategicImportance: 'Enterprise reach starts with one credible sponsor, not a cold campaign.',
      successCriteria: ['Introduction made by a named sponsor.', 'Follow-up meeting agreed.'],
    }),
    M('ms-sr-3', 'loo-sr', 'Fulton Hogan pathway qualified', '2026-10-16', 'future', 'medium', 'Mike', 0, {
      major: true,
      purpose: 'The route from pilot to wider Fulton Hogan adoption is mapped and confirmed with the sponsor.',
      strategicImportance: 'Converts a single pilot into an enterprise pathway.',
      successCriteria: ['Decision-makers, budget cycle and expansion route documented and confirmed.'],
    }),
    M('ms-sr-4', 'loo-sr', 'Strategic partner route defined', '2026-12-10', 'superseded', 'low', 'Mike', 0, {
      purpose: 'A defined route to market through a strategic partner.',
      strategicImportance: 'Superseded: the direct contractor pathway is outperforming the partner route.',
      notes: 'Superseded in June 2026 review. Direct contractor pathway carries the reach objective.',
    }),
    M('ms-sr-5', 'loo-sr', 'Enterprise channel opportunity validated', '2027-05-14', 'future', 'low', 'Mike', 0, {
      major: true,
      purpose: 'A named enterprise channel opportunity validated with real commitment, not interest.',
      strategicImportance: 'The Horizon 2 reach objective.',
      successCriteria: ['Named partner.', 'Committed next step with budget attached.'],
    }),

    // ------------------------------------------------ Company Capability
    M('ms-cc-1', 'loo-cc', 'Technical-lead profile confirmed', '2026-05-15', 'complete', 'high', 'Mike', 100, {
      purpose: 'Agree exactly what the technical lead must own before searching.',
      strategicImportance: 'A wrong hire here costs the campaign a year.',
      successCriteria: ['Profile and ownership boundaries documented.'],
      evidence: [{ id: 'ev-cc1-1', text: 'Technical lead profile v1 agreed.', date: '2026-05-15' }],
    }),
    M('ms-cc-2', 'loo-cc', 'Technical lead secured', '2026-09-01', 'blocked', 'low', 'Mike', 20, {
      major: true, founderAction: true,
      purpose: 'A technical lead is committed and started, owning V2 delivery.',
      strategicImportance:
        'The single most leveraged capability condition. Field readiness, pilot deployment and delivery cadence all depend on it.',
      successCriteria: ['Offer accepted.', 'Start date before pilot build peak.'],
      risks: [
        { id: 'rk-cc2-1', text: 'Candidate pool is thin at the equity-weighted package on offer.', severity: 'high' },
      ],
      decisions: [
        { id: 'dc-cc2-1', text: 'Lift the package or widen the search to Australia.', due: '2026-08-01', resolved: false },
      ],
      nextBestAction: 'Decide the package question, then re-approach the two warm candidates.',
      notes: 'Blocked on the package decision. Two warm candidates are waiting on it.',
      actions: [
        {
          id: 'act-cc2-60', block: 60,
          text: 'Decide the technical-lead package question and re-approach the two warm candidates.',
          completion: 'The package decision is made and both candidates have been contacted with a concrete offer path.',
        },
        {
          id: 'act-cc2-30', block: 30,
          text: 'Confirm the technical-lead role profile with Dan.',
          completion: 'The role profile is confirmed and ready to attach to the package decision.',
        },
      ],
      consequenceOfDelay:
        'Both warm candidates cool off and field readiness slips past the pilot window.',
    }),
    M('ms-cc-3', 'loo-cc', 'V2 delivery cadence established', '2026-10-20', 'future', 'medium', 'Technical Lead', 0, {
      purpose: 'A weekly build-measure-review cadence that survives founder absence.',
      strategicImportance: 'Delivery discipline is a stated Horizon 1 capability objective.',
      successCriteria: ['Cadence held for six consecutive weeks.'],
    }),
    M('ms-cc-4', 'loo-cc', 'Founder ownership clarified', '2026-06-30', 'complete', 'high', 'Mike', 100, {
      purpose: 'Explicitly decide what only the founder does, and what the founder must stop doing.',
      strategicImportance: 'Founder time is the scarcest resource in the campaign.',
      successCriteria: ['Ownership map written and in use.'],
      evidence: [{ id: 'ev-cc4-1', text: 'Founder ownership map v1.', date: '2026-06-30' }],
    }),
    M('ms-cc-5', 'loo-cc', 'Founder time protected', '2026-08-14', 'at-risk', 'medium', 'Mike', 40, {
      founderAction: true,
      purpose: 'Founder calendar reserves standing blocks for Main Effort work.',
      strategicImportance: 'Three current milestones depend on founder action; unprotected time starves all three.',
      successCriteria: ['Two protected half-days per week held for four consecutive weeks.'],
      risks: [
        { id: 'rk-cc5-1', text: 'Production support on current deployments keeps pre-empting reserved blocks.', severity: 'medium' },
      ],
    }),
    M('ms-cc-6', 'loo-cc', 'Runway plan confirmed', '2026-12-01', 'future', 'medium', 'Mike', 0, {
      major: true,
      purpose: 'A confirmed runway plan through Horizon 2 under conservative revenue assumptions.',
      strategicImportance: 'Sufficient runway is a stated Horizon 1 capability objective.',
      successCriteria: ['Plan confirmed with a named funding path for the downside case.'],
    }),
  ],

  dependencies: [
    // Fulton Hogan pilot agreed
    { id: 'dep-1', toMilestoneId: 'ms-mv-3', fromMilestoneId: 'ms-pt-1', note: 'Pilot scope must match the locked V2 scope.' },
    { id: 'dep-2', toMilestoneId: 'ms-mv-3', fromMilestoneId: 'ms-cr-1', note: 'A pilot proposal needs a price attached.' },
    { id: 'dep-3', toMilestoneId: 'ms-mv-3', label: 'Delivery owner identified', note: 'Carried by the technical lead search.' },
    // Live pilot deployment
    { id: 'dep-4', toMilestoneId: 'ms-pt-4', fromMilestoneId: 'ms-pt-3', note: 'Cannot deploy before field readiness.' },
    { id: 'dep-5', toMilestoneId: 'ms-pt-4', fromMilestoneId: 'ms-mv-3', note: 'Customer scope agreed through the pilot agreement.' },
    { id: 'dep-6', toMilestoneId: 'ms-pt-4', fromMilestoneId: 'ms-cc-2', note: 'Technical delivery capacity.' },
    // First paid renewal
    { id: 'dep-7', toMilestoneId: 'ms-cr-3', fromMilestoneId: 'ms-pt-4', note: 'Renewal follows a live deployment.' },
    { id: 'dep-8', toMilestoneId: 'ms-cr-3', label: 'Success measures captured', note: 'Agreed at pilot start, measured through deployment.' },
    { id: 'dep-9', toMilestoneId: 'ms-cr-3', label: 'Customer value demonstrated', note: 'Value evidence from the live pilot.' },
    // Supporting structure
    { id: 'dep-10', toMilestoneId: 'ms-cr-2', fromMilestoneId: 'ms-mv-3', note: 'The paid pilot is the agreed pilot.' },
    { id: 'dep-11', toMilestoneId: 'ms-pt-3', fromMilestoneId: 'ms-cc-2', note: 'Field hardening needs the technical lead.' },
    { id: 'dep-12', toMilestoneId: 'ms-sr-3', fromMilestoneId: 'ms-mv-3', note: 'Pathway qualification follows the pilot agreement.' },
    { id: 'dep-13', toMilestoneId: 'ms-mv-6', fromMilestoneId: 'ms-mv-5', note: 'Reference proof anchors the third customer.' },
  ],

  insights: [
    { id: 'in-1', kind: 'congestion', text: 'September is overcommitted: four milestones land within three weeks.' },
    { id: 'in-2', kind: 'founder', text: 'Three milestones depend on founder action this month.' },
    { id: 'in-3', kind: 'sequencing', text: 'Pilot is scheduled five weeks before product field readiness.' },
    { id: 'in-4', kind: 'resource', text: 'Product and Commercial objectives rely on the same technical resource.' },
    { id: 'in-5', kind: 'momentum', text: 'Main Effort has no completed milestone in the current month.' },
  ],

  waiting: [
    { id: 'wt-1', text: 'Fulton Hogan confirmation of the pilot review meeting date', who: 'Customer' },
    { id: 'wt-2', text: 'Developer estimate for the pilot workflow build', who: 'Contract developer' },
    { id: 'wt-3', text: 'Candidate responses on the technical-lead package', who: 'Candidates' },
  ],

  capacity: {
    minutes: 90,
    blocks: 2,
    energy: 'medium',
    meetings: '',
    together: false,
    constrainedDay: true,
  },

  closeouts: [],

  weekly: {
    outcomes: [
      'Fulton Hogan pilot scope agreed in principle',
      'Technical-lead package decision made and candidates re-engaged',
      'Pilot pricing structure tested with the design partner',
    ],
    updatedAt: '2026-07-19T18:00:00',
  },
};
