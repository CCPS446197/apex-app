import { Supplement, Peptide } from '../types'

export interface SuppCatalogEntry extends Omit<Supplement, 'time'> {
  time: string
  aliases?: string[]
}

export interface PepCatalogEntry extends Peptide {
  aliases?: string[]
}

export const SUPPLEMENT_CATALOG: SuppCatalogEntry[] = [
  // ── Protein ────────────────────────────────────────────────────────────
  { icon: '🥛', name: 'Whey Protein', dose: '25–50g / serving', desc: 'Fast-digesting complete protein — ideal post-workout for MPS', time: 'preworkout' },
  { icon: '🌙', name: 'Casein Protein', dose: '30–40g / night', desc: 'Slow-release MPS during sleep — reduces overnight catabolism', time: 'night' },
  { icon: '🌱', name: 'Plant Protein', dose: '25–40g / serving', desc: 'Pea/rice blend for complete amino acid profile', time: 'anytime' },

  // ── Creatine ───────────────────────────────────────────────────────────
  { icon: '⚡', name: 'Creatine Monohydrate', dose: '5g / day', desc: 'ATP regeneration, strength & hypertrophy — most evidence-backed supplement', time: 'morning' },
  { icon: '⚡', name: 'Creatine HCl', dose: '2–3g / day', desc: 'Higher solubility than monohydrate, lower dose required', time: 'morning' },
  { icon: '⚡', name: 'Creatine Ethyl Ester', dose: '3g / day', desc: 'Fat-soluble creatine variant for enhanced absorption', time: 'morning' },

  // ── Pre-workout / stimulants ───────────────────────────────────────────
  { icon: '💥', name: 'Beta-Alanine', dose: '3.2g / day', desc: 'Increases carnosine, buffers lactic acid — tingling is normal', time: 'preworkout' },
  { icon: '☕', name: 'Caffeine', dose: '150–200mg', desc: 'CNS stimulant — improves strength, endurance, and focus', time: 'preworkout' },
  { icon: '🫧', name: 'L-Citrulline', dose: '6–8g', desc: 'Nitric oxide precursor — enhances blood flow and pump', time: 'preworkout' },
  { icon: '🫧', name: 'Citrulline Malate', dose: '8g (2:1 ratio)', desc: 'L-Citrulline + malic acid — better endurance, reduced soreness', time: 'preworkout' },
  { icon: '🫧', name: 'L-Arginine', dose: '3–6g', desc: 'Direct NO precursor — less bioavailable than citrulline orally', time: 'preworkout' },
  { icon: '🫀', name: 'Taurine', dose: '2–3g', desc: 'Cell volumisation, electrolyte balance, antioxidant', time: 'preworkout' },
  { icon: '🧠', name: 'Alpha GPC', dose: '300–600mg', desc: 'Choline donor — enhances power output and cognitive function', time: 'preworkout', aliases: ['Alpha-GPC', 'Alpha-glycerophosphocholine'] },
  { icon: '🧠', name: 'Lion\'s Mane', dose: '500–1000mg', desc: 'NGF upregulation — neuroplasticity, focus, nerve health', time: 'morning', aliases: ['Lions Mane', 'Hericium erinaceus'] },
  { icon: '🧊', name: 'Betaine Anhydrous', dose: '2.5g', desc: 'Improves power and strength — osmolyte that aids cell hydration', time: 'preworkout' },
  { icon: '🫧', name: 'Agmatine Sulfate', dose: '500–1000mg', desc: 'nNOS inhibitor, pump enhancement, analgesic properties', time: 'preworkout' },

  // ── Omega-3 / fats ─────────────────────────────────────────────────────
  { icon: '🌊', name: 'Omega-3 Fish Oil', dose: '3g EPA+DHA / day', desc: 'Anti-inflammatory, joint health, cardiovascular protection', time: 'morning', aliases: ['Fish Oil', 'Omega-3'] },
  { icon: '🌱', name: 'Krill Oil', dose: '1–3g / day', desc: 'Phospholipid-bound omega-3 — superior bioavailability vs fish oil', time: 'morning' },

  // ── Vitamins / minerals ────────────────────────────────────────────────
  { icon: '☀️', name: 'Vitamin D3', dose: '2000–5000 IU / day', desc: 'Testosterone support, immune function, bone density', time: 'morning', aliases: ['Vitamin D', 'D3'] },
  { icon: '☀️', name: 'Vitamin D3 + K2', dose: '5000 IU D3 + 100mcg K2', desc: 'D3 for absorption, K2 directs calcium to bones not arteries', time: 'morning', aliases: ['D3 K2', 'D3+K2'] },
  { icon: '🫀', name: 'Magnesium Glycinate', dose: '400mg / night', desc: 'Deep sleep quality, muscle relaxation, insulin sensitivity', time: 'night', aliases: ['Magnesium', 'Mag Glycinate'] },
  { icon: '🫀', name: 'Magnesium Malate', dose: '300–400mg', desc: 'More energising than glycinate — better for daytime use', time: 'morning' },
  { icon: '🦴', name: 'Zinc', dose: '25–30mg', desc: 'Testosterone cofactor, immune function, wound healing', time: 'night' },
  { icon: '🦴', name: 'ZMA', dose: '30mg Zinc + 450mg Mg + 10.5mg B6', desc: 'Sleep quality and testosterone support combo', time: 'night', aliases: ['Zinc Magnesium Aspartate'] },
  { icon: '🌿', name: 'Vitamin C', dose: '500–1000mg', desc: 'Antioxidant, collagen synthesis, cortisol modulation', time: 'morning' },
  { icon: '💊', name: 'Multivitamin', dose: '1 serving / day', desc: 'Micronutrient baseline insurance for active individuals', time: 'morning' },
  { icon: '🦴', name: 'Calcium', dose: '500–1000mg', desc: 'Bone density, muscle contraction — take separate from zinc', time: 'night' },
  { icon: '🔬', name: 'Boron', dose: '3–10mg / day', desc: 'Free testosterone elevation, bone health, estrogen metabolism', time: 'morning' },

  // ── Adaptogens / nootropics ────────────────────────────────────────────
  { icon: '🌿', name: 'Ashwagandha', dose: '300–600mg', desc: 'Cortisol reduction, testosterone support, stress adaptation', time: 'morning', aliases: ['KSM-66', 'Withania somnifera'] },
  { icon: '🌿', name: 'Rhodiola Rosea', dose: '200–400mg', desc: 'Adaptogen — reduces fatigue, improves endurance and mental clarity', time: 'morning' },
  { icon: '🧠', name: 'L-Theanine', dose: '100–200mg', desc: 'Promotes calm focus, synergistic with caffeine — reduces jitteriness', time: 'morning' },
  { icon: '🧠', name: 'Phosphatidylserine', dose: '400mg', desc: 'Blunts cortisol response post-exercise, cognitive support', time: 'preworkout', aliases: ['PS'] },
  { icon: '🌿', name: 'Tongkat Ali', dose: '200–400mg', desc: 'LH stimulant — increases free testosterone, reduces SHBG', time: 'morning', aliases: ['Eurycoma longifolia', 'Longjack'] },
  { icon: '🌿', name: 'Fadogia Agrestis', dose: '400–600mg', desc: 'Increases LH and testosterone — often stacked with Tongkat Ali', time: 'morning' },
  { icon: '🌿', name: 'Shilajit', dose: '300–500mg', desc: 'Fulvic acid complex — testosterone, mitochondrial energy support', time: 'morning' },
  { icon: '🍊', name: 'Berberine', dose: '500mg, 3× / day', desc: 'AMPK activator — metabolic health, glucose control, gut microbiome', time: 'morning' },

  // ── Sleep / recovery ───────────────────────────────────────────────────
  { icon: '🌙', name: 'Melatonin', dose: '0.5–3mg', desc: 'Sleep onset — lower doses (0.5mg) more physiological than 10mg', time: 'night' },
  { icon: '🌙', name: 'Glycine', dose: '3–5g', desc: 'Lowers core body temperature, improves deep sleep quality', time: 'night' },
  { icon: '🌙', name: 'GABA', dose: '500–750mg', desc: 'Promotes sleep and relaxation — limited CNS penetration orally', time: 'night' },
  { icon: '🌙', name: 'Apigenin', dose: '50mg', desc: 'Natural anxiolytic — Andrew Huberman\'s sleep protocol component', time: 'night' },
  { icon: '🌿', name: 'Valerian Root', dose: '300–600mg', desc: 'Sleep quality improvement, reduces time to fall asleep', time: 'night' },
  { icon: '🌿', name: 'Lemon Balm', dose: '300–600mg', desc: 'GABA transaminase inhibitor — calm and sleep support', time: 'night' },

  // ── Longevity / biohacking ─────────────────────────────────────────────
  { icon: '🔬', name: 'NMN', dose: '500–1000mg / day', desc: 'NAD+ precursor — cellular energy, DNA repair, sirtuin activation', time: 'morning', aliases: ['Nicotinamide Mononucleotide'] },
  { icon: '🔬', name: 'NR (Nicotinamide Riboside)', dose: '300–500mg', desc: 'NAD+ precursor — alternative to NMN, slightly different pathway', time: 'morning', aliases: ['Nicotinamide Riboside'] },
  { icon: '🔬', name: 'Resveratrol', dose: '500mg / day', desc: 'SIRT1 activator — synergistic with NMN. Take with fat for absorption', time: 'morning' },
  { icon: '🔬', name: 'Quercetin', dose: '500–1000mg', desc: 'Senolytic, anti-inflammatory, mast cell stabiliser', time: 'morning' },
  { icon: '🫀', name: 'CoQ10 (Ubiquinol)', dose: '100–200mg', desc: 'Mitochondrial electron transport, antioxidant — use ubiquinol form', time: 'morning', aliases: ['CoQ10', 'Coenzyme Q10', 'Ubiquinol'] },
  { icon: '🔬', name: 'Spermidine', dose: '1–10mg', desc: 'Autophagy inducer — cellular clean-up, longevity signalling', time: 'morning' },
  { icon: '🫁', name: 'Metformin', dose: '500–1000mg', desc: 'AMPK activator — metabolic health. Prescription required.', time: 'morning' },
  { icon: '🔬', name: 'Rapamycin', dose: '5–6mg / week', desc: 'mTOR inhibitor — longevity protocol. Prescription required.', time: 'anytime' },

  // ── Muscle / performance ───────────────────────────────────────────────
  { icon: '💪', name: 'HMB', dose: '3g / day', desc: 'Anti-catabolic leucine metabolite — reduces muscle breakdown', time: 'anytime', aliases: ['Beta-Hydroxy Beta-Methylbutyrate'] },
  { icon: '🌿', name: 'Turkesterone', dose: '500mg / day', desc: 'Ecdysteroid — muscle protein synthesis support, no HPTA suppression', time: 'anytime' },
  { icon: '🌿', name: 'Ecdysterone', dose: '100–500mg / day', desc: 'Plant steroid — anabolic signalling without androgen receptor binding', time: 'anytime' },
  { icon: '💊', name: 'Digestive Enzymes', dose: '1–2 caps with meals', desc: 'Improves protein and nutrient absorption, reduces bloating', time: 'morning' },
  { icon: '🥛', name: 'Collagen Peptides', dose: '10–15g / day', desc: 'Joint health, tendon/ligament repair — take with vitamin C', time: 'morning', aliases: ['Collagen', 'Hydrolyzed Collagen'] },
]

export const PEPTIDE_CATALOG: PepCatalogEntry[] = [
  // ── Healing / recovery ────────────────────────────────────────────────
  { name: 'BPC-157', cls: 'Systemic · Research compound', dose: '250–500mcg / day', route: 'SubQ / Oral', cycle: '4–6 weeks on, 2 off', half: '~4 hours' },
  { name: 'TB-500', cls: 'Thymosin Beta-4 · Research compound', dose: '2–2.5mg, 2× / week', route: 'SubQ', cycle: '4–6 weeks', half: '~1 hour', aliases: ['Thymosin Beta-4', 'TB500'] },
  { name: 'TB-4 Fragment', cls: 'TB-500 active fragment · Research compound', dose: '200–400mcg / day', route: 'SubQ', cycle: '4–6 weeks', half: '~4 hours', aliases: ['TB4 Frag', 'TB-500 Frag'] },
  { name: 'BPC-157 + TB-500', cls: 'Healing stack · Research compounds', dose: '250mcg BPC + 2mg TB, 2×/wk', route: 'SubQ', cycle: '4–6 weeks', half: 'Variable', aliases: ['BPC TB combo'] },
  { name: 'GHK-Cu', cls: 'Copper peptide · Research compound', dose: '200–400mcg / day', route: 'SubQ / Topical', cycle: '4–8 weeks', half: '~1 hour', aliases: ['Copper peptide', 'GHK-Copper'] },
  { name: 'KPV', cls: 'Anti-inflammatory · Research compound', dose: '500mcg / day', route: 'SubQ / Oral', cycle: '4–8 weeks', half: '~1–2 hours' },
  { name: 'LL-37', cls: 'Antimicrobial peptide · Research compound', dose: '100–200mcg / day', route: 'SubQ', cycle: '4 weeks', half: '~2 hours' },

  // ── Growth hormone secretagogues ──────────────────────────────────────
  { name: 'CJC-1295 (No DAC)', cls: 'GHRH analogue · Research compound', dose: '100mcg pre-sleep', route: 'SubQ', cycle: 'Continuous / 3 months on', half: '30 min', aliases: ['CJC-1295 noDAC', 'Modified GRF 1-29'] },
  { name: 'CJC-1295 + Ipamorelin', cls: 'GHRH + GHRP stack · Research compound', dose: '100mcg CJC + 200mcg Ipa', route: 'SubQ pre-sleep', cycle: '3 months on/off', half: '~hours', aliases: ['CJC Ipamorelin stack'] },
  { name: 'Ipamorelin', cls: 'GHRP · Research compound', dose: '200–300mcg', route: 'SubQ pre-sleep', cycle: 'Continuous / 3 months on', half: '~2 hours' },
  { name: 'GHRP-2', cls: 'GHRP · Research compound', dose: '100–200mcg, 2–3× / day', route: 'SubQ', cycle: 'Cycled 3 on / 1 off', half: '~1 hour', aliases: ['Pralmorelin'] },
  { name: 'GHRP-6', cls: 'GHRP · Research compound', dose: '100–200mcg pre-workout', route: 'SubQ', cycle: 'Cycled 3 on / 1 off', half: '~2 hours' },
  { name: 'Hexarelin', cls: 'GHRP · Research compound', dose: '100mcg, 2× / day', route: 'SubQ', cycle: '4–6 weeks then break', half: '~3 hours', aliases: ['Examorelin'] },
  { name: 'Sermorelin', cls: 'GHRH analogue · Research compound', dose: '200–400mcg pre-sleep', route: 'SubQ', cycle: '3–6 months continuous', half: '~11 min', aliases: ['GRF 1-29'] },
  { name: 'Tesamorelin', cls: 'GHRH analogue · Research compound', dose: '1–2mg / day', route: 'SubQ', cycle: '3–6 months', half: '~26 min' },
  { name: 'MK-677 (Ibutamoren)', cls: 'GH secretagogue · Oral · Research compound', dose: '12.5–25mg / day', route: 'Oral', cycle: 'Continuous or 3 months on', half: '~24 hours', aliases: ['MK677', 'Ibutamoren', 'Nutrobal'] },
  { name: 'AOD-9604', cls: 'HGH fragment · Research compound', dose: '300mcg / day', route: 'SubQ fasted AM', cycle: '12 weeks', half: '~30 min', aliases: ['HGH Fragment 177-191', 'AOD9604'] },
  { name: 'Fragment 176-191', cls: 'HGH fragment · Research compound', dose: '250–500mcg, 2× / day', route: 'SubQ', cycle: '8–12 weeks', half: '~30 min', aliases: ['HGH Frag 176', 'Frag 176-191'] },

  // ── Cognitive / neurological ───────────────────────────────────────────
  { name: 'Selank', cls: 'Anxiolytic peptide · Research compound', dose: '300–500mcg / day', route: 'Nasal spray', cycle: '10–14 day course', half: 'Ultra-short', aliases: ['Selanc'] },
  { name: 'Semax', cls: 'ACTH analogue · Research compound', dose: '200–400mcg / day', route: 'Nasal spray', cycle: '2–3 weeks on/off', half: 'Ultra-short' },
  { name: 'N-Acetyl Semax', cls: 'ACTH analogue · Research compound', dose: '300mcg / day', route: 'Nasal spray', cycle: '2–3 weeks', half: 'Ultra-short', aliases: ['NA Semax', 'N-Acetyl Semax Amidate'] },
  { name: 'Dihexa', cls: 'Nootropic peptide · Research compound', dose: '10–30mg / day', route: 'Oral / Topical', cycle: '4–8 weeks', half: '~days' },
  { name: 'P21', cls: 'CNTF analogue · Research compound', dose: '300mcg / day', route: 'Nasal spray', cycle: '4–8 weeks', half: 'Short' },

  // ── Metabolic / body composition ──────────────────────────────────────
  { name: 'Semaglutide', cls: 'GLP-1 agonist · Rx / Research compound', dose: '0.25–2.4mg / week', route: 'SubQ weekly', cycle: 'Continuous', half: '~7 days', aliases: ['Ozempic', 'Wegovy'] },
  { name: 'Tirzepatide', cls: 'GIP/GLP-1 dual agonist · Rx / Research', dose: '2.5–15mg / week', route: 'SubQ weekly', cycle: 'Continuous', half: '~5 days', aliases: ['Mounjaro', 'Zepbound'] },
  { name: 'Retatrutide', cls: 'GIP/GLP-1/Glucagon triple agonist', dose: '2–12mg / week', route: 'SubQ weekly', cycle: 'Continuous', half: '~7 days' },
  { name: 'MOTS-c', cls: 'Mitochondrial peptide · Research compound', dose: '5–10mg / week', route: 'SubQ / IV', cycle: '3–6 months', half: '~hours' },
  { name: 'SS-31 (Elamipretide)', cls: 'Mitochondria-targeting peptide', dose: '40mg / day', route: 'SubQ', cycle: '4–8 weeks', half: '~minutes', aliases: ['Elamipretide', 'SS31'] },

  // ── Longevity / senolytic ─────────────────────────────────────────────
  { name: 'Epitalon', cls: 'Telomere peptide · Research compound', dose: '10mg / day', route: 'SubQ', cycle: '10-day course, 2× / year', half: '~minutes', aliases: ['Epithalon'] },
  { name: 'Thymosin Alpha-1', cls: 'Immune modulator · Research compound', dose: '1.6mg, 2× / week', route: 'SubQ', cycle: '6 weeks', half: '~2 hours', aliases: ['Thymalfasin', 'TA1', 'Thymosin Alpha1'] },
  { name: 'Humanin', cls: 'Mitochondrial peptide · Research compound', dose: '2–5mg / week', route: 'SubQ', cycle: '3–6 months', half: '~minutes' },

  // ── Sexual health ─────────────────────────────────────────────────────
  { name: 'PT-141', cls: 'Melanocortin · Research compound', dose: '1–2mg as needed', route: 'SubQ / Nasal', cycle: 'As needed', half: '~4 hours', aliases: ['Bremelanotide'] },
  { name: 'Melanotan II', cls: 'Melanocortin · Research compound', dose: '0.5–1mg', route: 'SubQ', cycle: 'Loading then maintenance', half: '~hours', aliases: ['MT-2', 'MT2'] },

  // ── Sleep ─────────────────────────────────────────────────────────────
  { name: 'DSIP', cls: 'Sleep peptide · Research compound', dose: '100–300mcg pre-sleep', route: 'SubQ', cycle: '5–10 days', half: '~minutes', aliases: ['Delta Sleep-Inducing Peptide'] },
]

// Fuzzy match — returns entries where query matches name, aliases, or starts of words
export function searchSupplements(query: string): SuppCatalogEntry[] {
  if (query.length < 2) return []
  const q = query.toLowerCase()
  return SUPPLEMENT_CATALOG.filter(s => {
    const haystack = [s.name, ...(s.aliases ?? [])].join(' ').toLowerCase()
    return haystack.includes(q)
  }).slice(0, 7)
}

export function searchPeptides(query: string): PepCatalogEntry[] {
  if (query.length < 2) return []
  const q = query.toLowerCase()
  return PEPTIDE_CATALOG.filter(p => {
    const haystack = [p.name, ...(p.aliases ?? [])].join(' ').toLowerCase()
    return haystack.includes(q)
  }).slice(0, 7)
}
