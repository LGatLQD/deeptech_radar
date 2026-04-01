export interface SicEntry {
  code: string;
  label: string;
  category: string;
  score: number;
  /** broad = generic software/IT code; deweighted 80% unless company also has a hard deep-tech code */
  broad?: boolean;
}

export const DEEP_TECH_SIC_CODES: SicEntry[] = [

  // ── AI / Software / Data ─────────────────────────────────────────────────────
  // Broad codes: scored at 20% of face value unless paired with a hard deep-tech code
  { code: '58290', label: 'Other software publishing',                              category: 'AI & Software',      score: 30,  broad: true },
  { code: '62011', label: 'Leisure and entertainment software development',         category: 'AI & Software',      score: 30,  broad: true },
  { code: '62012', label: 'Business and domestic software development',             category: 'AI & Software',      score: 40,  broad: true },
  { code: '62020', label: 'Information technology consultancy activities',          category: 'AI & Software',      score: 20,  broad: true },
  { code: '62030', label: 'Computer facilities management activities',              category: 'AI & Software',      score: 15,  broad: true },
  { code: '62090', label: 'Other information technology service activities',        category: 'AI & Software',      score: 15,  broad: true },
  { code: '63110', label: 'Data processing, hosting and related activities',        category: 'Data & Cloud',       score: 35,  broad: true },
  { code: '63120', label: 'Web portals',                                            category: 'Data & Cloud',       score: 15,  broad: true },
  { code: '63990', label: 'Other information service activities n.e.c.',            category: 'Data & Cloud',       score: 15,  broad: true },

  // ── Research & Development ────────────────────────────────────────────────────
  { code: '72110', label: 'R&D on biotechnology',                                   category: 'Biotech',            score: 50 },
  { code: '72190', label: 'R&D on natural sciences and engineering',                category: 'Deep R&D',           score: 50 },
  { code: '72200', label: 'R&D on social sciences and humanities',                  category: 'R&D',                score: 20 },
  { code: '71121', label: 'Engineering design for industrial process and production', category: 'Deep R&D',         score: 25 },
  { code: '71122', label: 'Engineering related scientific and technical consulting', category: 'Deep R&D',          score: 20 },
  { code: '71129', label: 'Other engineering activities',                            category: 'Deep R&D',          score: 20 },
  { code: '71200', label: 'Technical testing and analysis',                          category: 'Deep R&D',          score: 25 },

  // ── Biotech / Pharma ──────────────────────────────────────────────────────────
  { code: '21100', label: 'Manufacture of basic pharmaceutical products',           category: 'Biotech',            score: 45 },
  { code: '21200', label: 'Manufacture of pharmaceutical preparations',             category: 'Biotech',            score: 40 },

  // ── Electronics / Hardware / Semiconductors ───────────────────────────────────
  { code: '26110', label: 'Manufacture of electronic components',                   category: 'Hardware',           score: 45 },
  { code: '26120', label: 'Manufacture of loaded electronic boards',                category: 'Hardware',           score: 40 },
  { code: '26200', label: 'Manufacture of computers and peripheral equipment',      category: 'Hardware',           score: 40 },
  { code: '26301', label: 'Manufacture of telegraph and telephone apparatus',       category: 'Hardware',           score: 35 },
  { code: '26309', label: 'Manufacture of other communication equipment',           category: 'Hardware',           score: 35 },
  { code: '26400', label: 'Manufacture of consumer electronics',                    category: 'Hardware',           score: 20 },
  { code: '26511', label: 'Manufacture of electronic measuring and testing equipment', category: 'Hardware',        score: 35 },
  { code: '26512', label: 'Manufacture of electronic industrial process control equipment', category: 'Hardware',   score: 35 },
  { code: '26513', label: 'Manufacture of non-electronic measuring and testing equipment', category: 'Hardware',    score: 25 },
  { code: '26514', label: 'Manufacture of non-electronic industrial process control equipment', category: 'Hardware', score: 25 },
  { code: '26600', label: 'Manufacture of irradiation, electromedical and electrotherapeutic equipment', category: 'MedTech', score: 45 },
  { code: '26701', label: 'Manufacture of optical precision instruments',           category: 'Hardware',           score: 40 },
  { code: '26702', label: 'Manufacture of photographic and cinematographic equipment', category: 'Hardware',        score: 20 },
  { code: '26800', label: 'Manufacture of magnetic and optical media',              category: 'Hardware',           score: 20 },
  { code: '27110', label: 'Manufacture of electric motors, generators and transformers', category: 'Hardware',      score: 25 },
  { code: '27120', label: 'Manufacture of electricity distribution and control apparatus', category: 'CleanTech',   score: 20 },
  { code: '27200', label: 'Manufacture of batteries and accumulators',              category: 'CleanTech',          score: 40 },
  { code: '27310', label: 'Manufacture of fibre optic cables',                      category: 'Hardware',           score: 30 },
  { code: '27900', label: 'Manufacture of other electrical equipment',              category: 'Hardware',           score: 20 },

  // ── MedTech ───────────────────────────────────────────────────────────────────
  { code: '32500', label: 'Manufacture of medical and dental instruments and supplies', category: 'MedTech',        score: 45 },
  { code: '86210', label: 'General medical practice activities',                    category: 'HealthTech',         score: 20 },
  { code: '86220', label: 'Specialists medical practice activities',                category: 'HealthTech',         score: 20 },
  { code: '86900', label: 'Other human health activities',                          category: 'HealthTech',         score: 15 },

  // ── Clean Energy / CleanTech ──────────────────────────────────────────────────
  { code: '35110', label: 'Production of electricity',                              category: 'CleanTech',          score: 35 },
  { code: '35120', label: 'Transmission of electricity',                            category: 'CleanTech',          score: 20 },
  { code: '35130', label: 'Distribution of electricity',                            category: 'CleanTech',          score: 20 },
  { code: '35140', label: 'Trade of electricity',                                   category: 'CleanTech',          score: 25 },
  { code: '35210', label: 'Manufacture of gas',                                     category: 'CleanTech',          score: 25 },
  { code: '38210', label: 'Treatment and disposal of non-hazardous waste',          category: 'CleanTech',          score: 30 },
  { code: '38220', label: 'Treatment and disposal of hazardous waste',              category: 'CleanTech',          score: 30 },
  { code: '38320', label: 'Recovery of sorted materials',                           category: 'CleanTech',          score: 20 },
  { code: '39000', label: 'Remediation activities and other waste management',      category: 'CleanTech',          score: 20 },
  { code: '36000', label: 'Water collection, treatment and supply',                 category: 'CleanTech',          score: 20 },

  // ── Space / Aerospace ─────────────────────────────────────────────────────────
  { code: '30300', label: 'Manufacture of air and spacecraft and related machinery', category: 'Space & Aero',      score: 50 },
  { code: '51220', label: 'Space transport',                                         category: 'Space & Aero',      score: 50 },
  { code: '61300', label: 'Satellite telecommunications activities',                 category: 'Space & Aero',      score: 35 },
  { code: '51101', label: 'Scheduled passenger air transport',                       category: 'Space & Aero',      score: 20 },
  { code: '33160', label: 'Repair and maintenance of aircraft and spacecraft',       category: 'Space & Aero',      score: 25 },

  // ── Advanced Materials ────────────────────────────────────────────────────────
  { code: '20110', label: 'Manufacture of industrial gases',                        category: 'Advanced Materials', score: 30 },
  { code: '20130', label: 'Manufacture of other inorganic basic chemicals',         category: 'Advanced Materials', score: 20 },
  { code: '20140', label: 'Manufacture of other organic basic chemicals',           category: 'Advanced Materials', score: 20 },
  { code: '20160', label: 'Manufacture of plastics in primary forms',               category: 'Advanced Materials', score: 25 },
  { code: '20170', label: 'Manufacture of synthetic rubber in primary forms',       category: 'Advanced Materials', score: 20 },
  { code: '20590', label: 'Manufacture of other chemical products n.e.c.',         category: 'Advanced Materials', score: 20 },
  { code: '20600', label: 'Manufacture of man-made fibres',                         category: 'Advanced Materials', score: 25 },
  { code: '23140', label: 'Manufacture of glass fibres',                            category: 'Advanced Materials', score: 25 },
  { code: '23190', label: 'Manufacture and processing of other glass, incl. technical glassware', category: 'Advanced Materials', score: 25 },
  { code: '23200', label: 'Manufacture of refractory products',                     category: 'Advanced Materials', score: 20 },
  { code: '23430', label: 'Manufacture of ceramic insulators and insulating fittings', category: 'Advanced Materials', score: 20 },
  { code: '23440', label: 'Manufacture of other technical ceramic products',        category: 'Advanced Materials', score: 25 },
  { code: '24100', label: 'Manufacture of basic iron and steel and of ferro-alloys', category: 'Advanced Materials', score: 20 },
  { code: '24410', label: 'Precious metals production',                             category: 'Advanced Materials', score: 20 },
  { code: '24420', label: 'Aluminium production',                                   category: 'Advanced Materials', score: 15 },

  // ── Robotics / Automation ─────────────────────────────────────────────────────
  { code: '28110', label: 'Manufacture of engines and turbines (excl. vehicle engines)', category: 'Robotics',     score: 25 },
  { code: '28150', label: 'Manufacture of bearings, gears, gearing and driving elements', category: 'Robotics',    score: 20 },
  { code: '28410', label: 'Manufacture of metal forming machinery',                 category: 'Robotics',           score: 30 },
  { code: '28490', label: 'Manufacture of other machine tools',                     category: 'Robotics',           score: 25 },
  { code: '28990', label: 'Manufacture of other special-purpose machinery n.e.c.', category: 'Robotics',           score: 35 },
  { code: '33200', label: 'Installation of industrial machinery and equipment',     category: 'Robotics',           score: 25 },

  // ── EV & Automotive Tech ──────────────────────────────────────────────────────
  { code: '29310', label: 'Manufacture of electrical/electronic equipment for motor vehicles', category: 'EV & Automotive', score: 30 },
  { code: '29320', label: 'Manufacture of other parts and accessories for motor vehicles', category: 'EV & Automotive', score: 15 },
  { code: '30200', label: 'Manufacture of railway locomotives and rolling stock',   category: 'EV & Automotive',   score: 20 },

  // ── Defence & Security ────────────────────────────────────────────────────────
  { code: '25400', label: 'Manufacture of weapons and ammunition',                  category: 'Defence',            score: 30 },
  { code: '30400', label: 'Manufacture of military fighting vehicles',              category: 'Defence',            score: 30 },
  { code: '84220', label: 'Defence activities',                                     category: 'Defence',            score: 20 },

  // ── Nuclear ───────────────────────────────────────────────────────────────────
  { code: '24460', label: 'Processing of nuclear fuel',                             category: 'Nuclear',            score: 45 },
  { code: '07210', label: 'Mining of uranium and thorium ores',                     category: 'Nuclear',            score: 30 },
];

export const SIC_MAP = new Map<string, SicEntry>(
  DEEP_TECH_SIC_CODES.map((e) => [e.code, e])
);
