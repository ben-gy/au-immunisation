// Domain glossary — assume the reader knows nothing about immunisation data.
export interface Term {
  term: string;
  def: string;
}

export const GLOSSARY: Record<string, Term> = {
  'herd immunity': {
    term: 'Herd immunity',
    def: 'When enough of a population is immunised that a disease can no longer spread easily, protecting those who cannot be vaccinated (newborns, the immunocompromised). For highly infectious diseases like measles the accepted target is 95% coverage — the line this site measures every region against.',
  },
  'fully immunised': {
    term: 'Fully immunised',
    def: 'A child who has received all the vaccines due by a given age milestone under the National Immunisation Program. Reported at 1, 2 and 5 years of age.',
  },
  sa3: {
    term: 'SA3 (Statistical Area Level 3)',
    def: 'An ABS geographic region of roughly 30,000–130,000 people — usually a group of suburbs or a large town and its surrounds. Australia has about 340 of them, making SA3 the finest area at which immunisation coverage is published.',
  },
  phn: {
    term: 'PHN (Primary Health Network)',
    def: 'One of 31 regions used to plan and commission primary health care. First Nations coverage is published at PHN level (SA3 numbers would be too small to report safely).',
  },
  air: {
    term: 'Australian Immunisation Register (AIR)',
    def: 'The national register that records vaccinations given to people of all ages in Australia. It is the source of the coverage figures on this site.',
  },
  coverage: {
    term: 'Coverage rate',
    def: 'The percentage of children in an area who are fully immunised for their age. 92% coverage means 8 in every 100 children are not up to date.',
  },
  'rolling four quarters': {
    term: 'Rolling four quarters',
    def: 'Each release annualises the four most recent quarters of data. This smooths out small-area noise, so the figures move slowly and shouldn’t be read as a single month.',
  },
  'first nations': {
    term: 'First Nations children',
    def: 'Aboriginal and Torres Strait Islander children, reported as a separate cohort so that gaps in coverage can be identified and closed.',
  },
  suppressed: {
    term: 'Suppressed / Not Published',
    def: 'Where fewer than 25 children are counted, the rate is withheld to protect privacy. These areas appear grey on the map and blank in tables.',
  },
  dtp: { term: 'DTP', def: 'Vaccine against diphtheria, tetanus and pertussis (whooping cough). Due in the first year of life.' },
  mmr: { term: 'MMR', def: 'Vaccine against measles, mumps and rubella. First dose is due around 12 months, so it counts from the 2-year milestone.' },
  hib: { term: 'Hib', def: 'Vaccine against Haemophilus influenzae type b, a cause of childhood meningitis and epiglottitis.' },
  polio: { term: 'Polio', def: 'Vaccine against poliomyelitis, a virus that can cause paralysis.' },
  pneumo: { term: 'Pneumococcal', def: 'Vaccine against pneumococcal disease (pneumonia, meningitis, blood infections).' },
  menc: { term: 'Meningococcal', def: 'Vaccine against meningococcal disease. The schedule now uses a combined ACWY vaccine.' },
  varicella: { term: 'Varicella', def: 'Vaccine against varicella (chickenpox), due around 18 months.' },
  hep: { term: 'Hepatitis B', def: 'Vaccine against hepatitis B, a liver infection. A birth dose is followed by further doses in infancy.' },
};

/** Wrap a jargon term in a clickable glossary link if it exists. */
export function gl(key: string, label?: string): string {
  const t = GLOSSARY[key.toLowerCase()];
  const text = label ?? (t ? t.term : key);
  if (!t) return text;
  return `<span class="glossary-link" data-term="${key.toLowerCase()}" tabindex="0" role="button">${text}<span class="gl-i">?</span></span>`;
}
