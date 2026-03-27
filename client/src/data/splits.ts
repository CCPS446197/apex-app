export type WorkoutType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full' | 'rest'

export interface SplitExercise {
  exerciseId: string
  sets: number
  reps: string
  weight: number
  restSec: number
}

export interface SplitDayTemplate {
  name: string
  type: WorkoutType
  muscle: string
  exercises: SplitExercise[]
}

export interface SplitTemplate {
  id: string
  name: string
  frequency: string
  split: string
  goal: 'hypertrophy' | 'strength' | 'mixed'
  description: string
  scienceNote: string
  citation: string
  days: SplitDayTemplate[]   // exactly 7 items (Mon → Sun)
}

const REST: SplitDayTemplate = {
  name: 'Rest', type: 'rest',
  muscle: 'Full recovery', exercises: [],
}

const splits: SplitTemplate[] = [
  // ── 1. PPL 6-day (Hypertrophy, RP-style) ─────────────────────────────
  {
    id: 'ppl_6',
    name: 'Push / Pull / Legs',
    frequency: '6 days / week',
    split: 'PPL',
    goal: 'hypertrophy',
    description: 'Each muscle group trained twice per week with a volume-accumulation A/B structure. Industry gold-standard for intermediate hypertrophy.',
    scienceNote: 'Frequency research (Schoenfeld, Ogborn & Krieger, 2016) confirms 2× per week per muscle group superior to 1× for hypertrophy in equated volume. A/B sessions allow within-week exercise variation, reducing accommodation. Per RP guidelines, weekly volume per muscle stays within MEV–MRV window.',
    citation: 'Schoenfeld BJ et al. (2016). Effects of resistance training frequency on measures of muscle hypertrophy: A systematic review and meta-analysis. Sports Med.',
    days: [
      {
        name: 'Push A', type: 'push', muscle: 'Chest · Shoulders · Triceps',
        exercises: [
          { exerciseId: 'flat_bb_bench',    sets: 4, reps: '6–8',  weight: 100, restSec: 180 },
          { exerciseId: 'ohp',              sets: 4, reps: '6–8',  weight: 60,  restSec: 180 },
          { exerciseId: 'incline_db_press', sets: 3, reps: '8–10', weight: 36,  restSec: 120 },
          { exerciseId: 'lateral_raises',   sets: 4, reps: '12–15',weight: 12,  restSec: 90  },
          { exerciseId: 'cable_fly',        sets: 3, reps: '12–15',weight: 14,  restSec: 90  },
          { exerciseId: 'tricep_pushdowns', sets: 3, reps: '10–12',weight: 30,  restSec: 60  },
        ],
      },
      {
        name: 'Pull A', type: 'pull', muscle: 'Back · Biceps · Rear Delts',
        exercises: [
          { exerciseId: 'bb_row',          sets: 4, reps: '6–8',  weight: 80,  restSec: 180 },
          { exerciseId: 'lat_pulldown',    sets: 3, reps: '10–12',weight: 70,  restSec: 120 },
          { exerciseId: 'cable_row',       sets: 3, reps: '10–12',weight: 65,  restSec: 120 },
          { exerciseId: 'face_pulls',      sets: 3, reps: '15–20',weight: 20,  restSec: 60  },
          { exerciseId: 'bb_curl',         sets: 3, reps: '8–12', weight: 40,  restSec: 90  },
          { exerciseId: 'hammer_curl',     sets: 3, reps: '10–12',weight: 16,  restSec: 90  },
        ],
      },
      {
        name: 'Legs A', type: 'legs', muscle: 'Quads · Hamstrings · Calves',
        exercises: [
          { exerciseId: 'back_squat',          sets: 4, reps: '5–7',  weight: 120, restSec: 240 },
          { exerciseId: 'leg_press',           sets: 3, reps: '10–12',weight: 150, restSec: 180 },
          { exerciseId: 'rdl',                 sets: 3, reps: '8–10', weight: 90,  restSec: 180 },
          { exerciseId: 'leg_extension',       sets: 3, reps: '12–15',weight: 55,  restSec: 90  },
          { exerciseId: 'lying_leg_curl',      sets: 3, reps: '10–12',weight: 45,  restSec: 90  },
          { exerciseId: 'standing_calf_raise', sets: 4, reps: '12–15',weight: 80,  restSec: 60  },
        ],
      },
      {
        name: 'Push B', type: 'push', muscle: 'Chest · Shoulders · Triceps',
        exercises: [
          { exerciseId: 'incline_db_press',  sets: 4, reps: '8–10', weight: 38,  restSec: 120 },
          { exerciseId: 'weighted_dips',     sets: 3, reps: '8–12', weight: 20,  restSec: 120 },
          { exerciseId: 'arnold_press',      sets: 3, reps: '8–10', weight: 24,  restSec: 120 },
          { exerciseId: 'cable_lateral',     sets: 4, reps: '15–20',weight: 10,  restSec: 60  },
          { exerciseId: 'overhead_tri_ext',  sets: 3, reps: '10–12',weight: 20,  restSec: 90  },
          { exerciseId: 'skull_crushers',    sets: 3, reps: '10–12',weight: 30,  restSec: 90  },
        ],
      },
      {
        name: 'Pull B', type: 'pull', muscle: 'Back · Biceps · Rear Delts',
        exercises: [
          { exerciseId: 'deadlift',          sets: 3, reps: '4–6',  weight: 140, restSec: 240 },
          { exerciseId: 'pullup',            sets: 3, reps: '6–10', weight: 0,   restSec: 120 },
          { exerciseId: 'single_arm_db_row', sets: 3, reps: '10–12',weight: 40,  restSec: 90  },
          { exerciseId: 'face_pulls',        sets: 3, reps: '15–20',weight: 20,  restSec: 60  },
          { exerciseId: 'incline_db_curl',   sets: 3, reps: '10–12',weight: 14,  restSec: 90  },
          { exerciseId: 'cable_curl',        sets: 3, reps: '12–15',weight: 30,  restSec: 90  },
        ],
      },
      {
        name: 'Legs B', type: 'legs', muscle: 'Hamstrings · Glutes · Quads',
        exercises: [
          { exerciseId: 'bulgarian_squat',     sets: 3, reps: '8–10', weight: 28,  restSec: 120 },
          { exerciseId: 'hack_squat',          sets: 3, reps: '8–10', weight: 80,  restSec: 180 },
          { exerciseId: 'hip_thrust',          sets: 3, reps: '10–12',weight: 80,  restSec: 120 },
          { exerciseId: 'rdl',                 sets: 3, reps: '8–10', weight: 90,  restSec: 180 },
          { exerciseId: 'seated_leg_curl',     sets: 3, reps: '12–15',weight: 40,  restSec: 90  },
          { exerciseId: 'seated_calf_raise',   sets: 3, reps: '15–20',weight: 50,  restSec: 60  },
        ],
      },
      REST,
    ],
  },

  // ── 2. Upper/Lower 4-day ──────────────────────────────────────────────
  {
    id: 'upper_lower_4',
    name: 'Upper / Lower',
    frequency: '4 days / week',
    split: 'Upper / Lower',
    goal: 'mixed',
    description: 'Alternates heavy (3–6 rep) and volume (8–12 rep) sessions for each region. Optimal balance of strength and size for intermediate lifters.',
    scienceNote: 'Upper/Lower splits allow 2× weekly frequency per muscle group with a built-in heavy/light undulation — concurrent strength and hypertrophy stimulus. Colquhoun et al. (2018): 3× frequency not superior to 2× when volume is equated, making 4-day UL efficient without diminishing returns.',
    citation: 'Colquhoun RJ et al. (2018). Training volume, not frequency, indicative of maximal strength adaptations. J Strength Cond Res.',
    days: [
      {
        name: 'Upper A (Heavy)', type: 'upper', muscle: 'Chest · Back · Shoulders · Arms',
        exercises: [
          { exerciseId: 'flat_bb_bench',  sets: 4, reps: '4–6',  weight: 105, restSec: 240 },
          { exerciseId: 'bb_row',         sets: 4, reps: '4–6',  weight: 82,  restSec: 240 },
          { exerciseId: 'ohp',            sets: 3, reps: '5–7',  weight: 62,  restSec: 180 },
          { exerciseId: 'pullup',         sets: 3, reps: '6–8',  weight: 10,  restSec: 120 },
          { exerciseId: 'bb_curl',        sets: 3, reps: '8–10', weight: 40,  restSec: 90  },
          { exerciseId: 'close_grip_bench',sets: 3, reps: '8–10',weight: 72,  restSec: 90  },
        ],
      },
      {
        name: 'Lower A (Quad)', type: 'lower', muscle: 'Quads · Hamstrings · Glutes · Calves',
        exercises: [
          { exerciseId: 'back_squat',          sets: 4, reps: '4–6',  weight: 125, restSec: 240 },
          { exerciseId: 'rdl',                 sets: 3, reps: '6–8',  weight: 92,  restSec: 180 },
          { exerciseId: 'leg_press',           sets: 3, reps: '8–10', weight: 155, restSec: 180 },
          { exerciseId: 'lying_leg_curl',      sets: 3, reps: '10–12',weight: 45,  restSec: 90  },
          { exerciseId: 'standing_calf_raise', sets: 4, reps: '10–12',weight: 85,  restSec: 60  },
        ],
      },
      REST,
      {
        name: 'Upper B (Volume)', type: 'upper', muscle: 'Chest · Back · Shoulders · Arms',
        exercises: [
          { exerciseId: 'incline_db_press', sets: 4, reps: '8–10', weight: 38,  restSec: 120 },
          { exerciseId: 'cable_row',        sets: 4, reps: '10–12',weight: 65,  restSec: 120 },
          { exerciseId: 'arnold_press',     sets: 3, reps: '10–12',weight: 22,  restSec: 120 },
          { exerciseId: 'lat_pulldown',     sets: 3, reps: '10–12',weight: 70,  restSec: 120 },
          { exerciseId: 'lateral_raises',   sets: 4, reps: '12–15',weight: 12,  restSec: 90  },
          { exerciseId: 'face_pulls',       sets: 3, reps: '15–20',weight: 20,  restSec: 60  },
          { exerciseId: 'incline_db_curl',  sets: 3, reps: '10–12',weight: 14,  restSec: 90  },
          { exerciseId: 'tricep_pushdowns', sets: 3, reps: '10–12',weight: 30,  restSec: 60  },
        ],
      },
      {
        name: 'Lower B (Hip)', type: 'lower', muscle: 'Hamstrings · Glutes · Quads',
        exercises: [
          { exerciseId: 'hip_thrust',          sets: 4, reps: '8–12', weight: 82,  restSec: 120 },
          { exerciseId: 'bulgarian_squat',     sets: 3, reps: '8–10', weight: 28,  restSec: 120 },
          { exerciseId: 'rdl',                 sets: 3, reps: '10–12',weight: 88,  restSec: 180 },
          { exerciseId: 'seated_leg_curl',     sets: 3, reps: '12–15',weight: 40,  restSec: 90  },
          { exerciseId: 'leg_extension',       sets: 3, reps: '12–15',weight: 55,  restSec: 90  },
          { exerciseId: 'seated_calf_raise',   sets: 3, reps: '15–20',weight: 50,  restSec: 60  },
        ],
      },
      REST,
      REST,
    ],
  },

  // ── 3. Full Body 3-day ───────────────────────────────────────────────
  {
    id: 'full_body_3',
    name: 'Full Body',
    frequency: '3 days / week',
    split: 'Full Body',
    goal: 'mixed',
    description: 'Maximum frequency — every muscle trained 3× per week. Best protein synthesis stimulus per session, ideal for building an efficient base.',
    scienceNote: 'Protein synthesis peaks 24h post-session and returns to baseline by ~36h (Phillips & Van Loon, 2011). Three full-body sessions every ~48h maintains elevated MPS continuously. Colquhoun (2018) confirms 3× frequency not inferior to higher frequencies when volume is equated. Ideal for beginners and lifters with limited training time.',
    citation: 'Phillips SM & Van Loon LJC (2011). Dietary protein for athletes: from requirements to optimum adaptation. J Sports Sci.',
    days: [
      {
        name: 'Full Body A', type: 'full', muscle: 'All Muscle Groups',
        exercises: [
          { exerciseId: 'back_squat',      sets: 4, reps: '5–7',  weight: 115, restSec: 240 },
          { exerciseId: 'flat_bb_bench',   sets: 4, reps: '6–8',  weight: 95,  restSec: 180 },
          { exerciseId: 'bb_row',          sets: 4, reps: '6–8',  weight: 78,  restSec: 180 },
          { exerciseId: 'ohp',             sets: 3, reps: '8–10', weight: 55,  restSec: 120 },
          { exerciseId: 'rdl',             sets: 3, reps: '8–10', weight: 85,  restSec: 180 },
          { exerciseId: 'bb_curl',         sets: 2, reps: '10–12',weight: 38,  restSec: 90  },
          { exerciseId: 'tricep_pushdowns',sets: 2, reps: '10–12',weight: 28,  restSec: 60  },
        ],
      },
      REST,
      {
        name: 'Full Body B', type: 'full', muscle: 'All Muscle Groups',
        exercises: [
          { exerciseId: 'deadlift',        sets: 3, reps: '4–6',  weight: 135, restSec: 240 },
          { exerciseId: 'incline_db_press',sets: 4, reps: '8–10', weight: 36,  restSec: 120 },
          { exerciseId: 'lat_pulldown',    sets: 4, reps: '10–12',weight: 68,  restSec: 120 },
          { exerciseId: 'arnold_press',    sets: 3, reps: '10–12',weight: 22,  restSec: 120 },
          { exerciseId: 'leg_press',       sets: 3, reps: '10–12',weight: 145, restSec: 180 },
          { exerciseId: 'lying_leg_curl',  sets: 3, reps: '10–12',weight: 43,  restSec: 90  },
          { exerciseId: 'lateral_raises',  sets: 3, reps: '12–15',weight: 11,  restSec: 90  },
        ],
      },
      REST,
      {
        name: 'Full Body C', type: 'full', muscle: 'All Muscle Groups',
        exercises: [
          { exerciseId: 'bulgarian_squat',  sets: 3, reps: '8–10', weight: 26,  restSec: 120 },
          { exerciseId: 'weighted_dips',    sets: 3, reps: '8–12', weight: 18,  restSec: 120 },
          { exerciseId: 'pullup',           sets: 4, reps: '6–10', weight: 5,   restSec: 120 },
          { exerciseId: 'ohp',              sets: 3, reps: '8–10', weight: 55,  restSec: 120 },
          { exerciseId: 'hip_thrust',       sets: 3, reps: '10–12',weight: 78,  restSec: 120 },
          { exerciseId: 'cable_row',        sets: 3, reps: '10–12',weight: 62,  restSec: 90  },
          { exerciseId: 'standing_calf_raise',sets: 3,reps:'12–15',weight: 78,  restSec: 60  },
        ],
      },
      REST,
      REST,
    ],
  },

  // ── 4. PPL 3-day (Strength Focus) ────────────────────────────────────
  {
    id: 'ppl_3',
    name: 'Push / Pull / Legs',
    frequency: '3 days / week',
    split: 'PPL (Strength)',
    goal: 'strength',
    description: 'One session per pattern per week, lower volume with higher intensity. Recommended for lifters prioritising strength gains or managing high training fatigue.',
    scienceNote: 'Lower frequency reduces accumulated fatigue, enabling higher per-session intensities (%1RM). Helms et al. (2016) RIR-based training model: 3-day PPL at ≤4 RIR with progressive overload produces measurable strength gains in 4–6 week mesocycles. Simpler to programme for non-linear overload.',
    citation: 'Helms ER et al. (2016). RPE-based training in a weightlifting context. Int J Sports Physiol Perform.',
    days: [
      {
        name: 'Push', type: 'push', muscle: 'Chest · Shoulders · Triceps',
        exercises: [
          { exerciseId: 'flat_bb_bench',   sets: 5, reps: '3–5',  weight: 107, restSec: 240 },
          { exerciseId: 'ohp',             sets: 4, reps: '4–6',  weight: 63,  restSec: 240 },
          { exerciseId: 'incline_db_press',sets: 3, reps: '8–10', weight: 38,  restSec: 120 },
          { exerciseId: 'lateral_raises',  sets: 3, reps: '12–15',weight: 12,  restSec: 90  },
          { exerciseId: 'skull_crushers',  sets: 3, reps: '8–10', weight: 32,  restSec: 90  },
        ],
      },
      {
        name: 'Pull', type: 'pull', muscle: 'Back · Biceps · Rear Delts',
        exercises: [
          { exerciseId: 'deadlift',       sets: 4, reps: '3–5',  weight: 145, restSec: 300 },
          { exerciseId: 'bb_row',         sets: 4, reps: '5–7',  weight: 82,  restSec: 180 },
          { exerciseId: 'pullup',         sets: 3, reps: '6–8',  weight: 12,  restSec: 120 },
          { exerciseId: 'face_pulls',     sets: 3, reps: '15–20',weight: 20,  restSec: 60  },
          { exerciseId: 'bb_curl',        sets: 3, reps: '8–10', weight: 42,  restSec: 90  },
        ],
      },
      REST,
      {
        name: 'Legs', type: 'legs', muscle: 'Quads · Hamstrings · Glutes · Calves',
        exercises: [
          { exerciseId: 'back_squat',          sets: 5, reps: '3–5',  weight: 125, restSec: 300 },
          { exerciseId: 'rdl',                 sets: 4, reps: '5–7',  weight: 95,  restSec: 240 },
          { exerciseId: 'leg_press',           sets: 3, reps: '8–10', weight: 155, restSec: 180 },
          { exerciseId: 'lying_leg_curl',      sets: 3, reps: '8–10', weight: 47,  restSec: 90  },
          { exerciseId: 'standing_calf_raise', sets: 4, reps: '10–12',weight: 85,  restSec: 60  },
        ],
      },
      REST,
      REST,
      REST,
    ],
  },

  // ── 5. Arnold Split 5-day ─────────────────────────────────────────────
  {
    id: 'arnold_5',
    name: 'Arnold Split',
    frequency: '5 days / week',
    split: 'Chest+Back / Shoulders+Arms / Legs',
    goal: 'hypertrophy',
    description: 'Antagonist muscle pairing pioneered by Arnold Schwarzenegger. Back serves as active recovery for chest and vice-versa, enabling higher session volume.',
    scienceNote: 'Antagonist supersets (Robbins et al., 2010) allow maintained performance between antagonist pairs due to reciprocal inhibition — reduces effective rest time without compromising stimulus. Paired with Thibaudeau\'s density training principles: more work per unit time. Chest/back pairing is particularly advantageous as both are involved in opposing shoulder girdle movements.',
    citation: 'Robbins DW et al. (2010). The effect of an upper-body agonist-antagonist resistance training protocol on volume load and efficiency. J Strength Cond Res.',
    days: [
      {
        name: 'Chest + Back', type: 'push', muscle: 'Chest · Back',
        exercises: [
          { exerciseId: 'flat_bb_bench',   sets: 4, reps: '6–8',  weight: 100, restSec: 180 },
          { exerciseId: 'bb_row',          sets: 4, reps: '6–8',  weight: 80,  restSec: 180 },
          { exerciseId: 'incline_db_press',sets: 3, reps: '8–10', weight: 36,  restSec: 120 },
          { exerciseId: 'lat_pulldown',    sets: 3, reps: '10–12',weight: 70,  restSec: 120 },
          { exerciseId: 'cable_fly',       sets: 3, reps: '12–15',weight: 14,  restSec: 90  },
          { exerciseId: 'cable_row',       sets: 3, reps: '10–12',weight: 65,  restSec: 90  },
        ],
      },
      {
        name: 'Shoulders + Arms', type: 'push', muscle: 'Shoulders · Biceps · Triceps',
        exercises: [
          { exerciseId: 'ohp',             sets: 4, reps: '6–8',  weight: 60,  restSec: 180 },
          { exerciseId: 'lateral_raises',  sets: 4, reps: '12–15',weight: 12,  restSec: 90  },
          { exerciseId: 'rear_delt_fly',   sets: 3, reps: '15–20',weight: 8,   restSec: 60  },
          { exerciseId: 'bb_curl',         sets: 4, reps: '8–12', weight: 40,  restSec: 90  },
          { exerciseId: 'incline_db_curl', sets: 3, reps: '10–12',weight: 14,  restSec: 90  },
          { exerciseId: 'close_grip_bench',sets: 4, reps: '8–10', weight: 70,  restSec: 120 },
          { exerciseId: 'overhead_tri_ext',sets: 3, reps: '10–12',weight: 20,  restSec: 90  },
        ],
      },
      {
        name: 'Legs A', type: 'legs', muscle: 'Quads · Hamstrings · Glutes · Calves',
        exercises: [
          { exerciseId: 'back_squat',          sets: 4, reps: '5–7',  weight: 120, restSec: 240 },
          { exerciseId: 'rdl',                 sets: 3, reps: '8–10', weight: 90,  restSec: 180 },
          { exerciseId: 'leg_press',           sets: 3, reps: '10–12',weight: 150, restSec: 180 },
          { exerciseId: 'lying_leg_curl',      sets: 3, reps: '10–12',weight: 45,  restSec: 90  },
          { exerciseId: 'standing_calf_raise', sets: 4, reps: '12–15',weight: 80,  restSec: 60  },
        ],
      },
      {
        name: 'Chest + Back', type: 'push', muscle: 'Chest · Back',
        exercises: [
          { exerciseId: 'weighted_dips',   sets: 4, reps: '8–12', weight: 20,  restSec: 120 },
          { exerciseId: 'deadlift',        sets: 3, reps: '4–6',  weight: 140, restSec: 240 },
          { exerciseId: 'db_flat_press',   sets: 3, reps: '8–10', weight: 40,  restSec: 120 },
          { exerciseId: 'pullup',          sets: 3, reps: '6–10', weight: 0,   restSec: 120 },
          { exerciseId: 'cable_fly',       sets: 3, reps: '12–15',weight: 14,  restSec: 90  },
          { exerciseId: 'face_pulls',      sets: 3, reps: '15–20',weight: 20,  restSec: 60  },
        ],
      },
      {
        name: 'Shoulders + Arms', type: 'push', muscle: 'Shoulders · Biceps · Triceps',
        exercises: [
          { exerciseId: 'arnold_press',    sets: 4, reps: '8–10', weight: 24,  restSec: 120 },
          { exerciseId: 'cable_lateral',   sets: 4, reps: '15–20',weight: 10,  restSec: 60  },
          { exerciseId: 'face_pulls',      sets: 3, reps: '15–20',weight: 20,  restSec: 60  },
          { exerciseId: 'hammer_curl',     sets: 3, reps: '10–12',weight: 16,  restSec: 90  },
          { exerciseId: 'cable_curl',      sets: 3, reps: '12–15',weight: 30,  restSec: 90  },
          { exerciseId: 'tricep_pushdowns',sets: 4, reps: '10–12',weight: 30,  restSec: 60  },
          { exerciseId: 'skull_crushers',  sets: 3, reps: '10–12',weight: 28,  restSec: 90  },
        ],
      },
      REST,
      REST,
    ],
  },
]

export default splits

export function getSplitById(id: string): SplitTemplate | undefined {
  return splits.find(s => s.id === id)
}
