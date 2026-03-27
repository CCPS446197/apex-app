export interface ExerciseTemplate {
  id: string
  name: string
  muscles: string[]       // primary muscles
  secondary: string[]     // secondary muscles
  mechanic: 'compound' | 'isolation'
  equipment: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight'
  defaultSets: number
  defaultReps: string
  defaultWeight: number   // kg — intermediate male reference
  defaultRestSec: number
  tip: string             // brief evidence-based cue
}

const exercises: ExerciseTemplate[] = [
  // ── CHEST ─────────────────────────────────────────────────────────────
  {
    id: 'flat_bb_bench',
    name: 'Flat Barbell Bench Press',
    muscles: ['Chest'], secondary: ['Shoulders', 'Triceps'],
    mechanic: 'compound', equipment: 'barbell',
    defaultSets: 4, defaultReps: '6–8', defaultWeight: 100, defaultRestSec: 180,
    tip: 'Retract scapula, leg drive into floor. RIR 2 — maximal mechanical tension on sternal fibres.',
  },
  {
    id: 'incline_db_press',
    name: 'Incline DB Press',
    muscles: ['Chest'], secondary: ['Shoulders', 'Triceps'],
    mechanic: 'compound', equipment: 'dumbbell',
    defaultSets: 3, defaultReps: '8–10', defaultWeight: 36, defaultRestSec: 120,
    tip: '30° incline preferentially recruits clavicular fibres. Supinate wrist at top for full clavicular contraction.',
  },
  {
    id: 'cable_fly',
    name: 'Cable Crossover Fly',
    muscles: ['Chest'], secondary: [],
    mechanic: 'isolation', equipment: 'cable',
    defaultSets: 3, defaultReps: '12–15', defaultWeight: 14, defaultRestSec: 90,
    tip: 'Cables maintain tension across full ROM — superior to DB flyes at end range. Slight forward lean maximises stretch.',
  },
  {
    id: 'weighted_dips',
    name: 'Weighted Dips',
    muscles: ['Chest'], secondary: ['Triceps', 'Shoulders'],
    mechanic: 'compound', equipment: 'bodyweight',
    defaultSets: 3, defaultReps: '8–12', defaultWeight: 20, defaultRestSec: 120,
    tip: 'Forward lean shifts load to chest. RIR 2. Schoenfeld (2020): compound stretching exercises superior for hypertrophy.',
  },
  {
    id: 'db_flat_press',
    name: 'DB Flat Press',
    muscles: ['Chest'], secondary: ['Shoulders', 'Triceps'],
    mechanic: 'compound', equipment: 'dumbbell',
    defaultSets: 3, defaultReps: '8–10', defaultWeight: 40, defaultRestSec: 120,
    tip: 'Greater ROM than barbell — allows slight adduction at top. Unilateral stability demand adds recruitment.',
  },

  // ── BACK ──────────────────────────────────────────────────────────────
  {
    id: 'bb_row',
    name: 'Barbell Row',
    muscles: ['Back'], secondary: ['Biceps', 'Rear Delts'],
    mechanic: 'compound', equipment: 'barbell',
    defaultSets: 4, defaultReps: '6–8', defaultWeight: 80, defaultRestSec: 180,
    tip: 'Hinge to ~45°. Pull elbows back, not up. Lat activation greatest with neutral spine and full elbow extension at bottom.',
  },
  {
    id: 'deadlift',
    name: 'Conventional Deadlift',
    muscles: ['Back'], secondary: ['Hamstrings', 'Glutes', 'Quads'],
    mechanic: 'compound', equipment: 'barbell',
    defaultSets: 3, defaultReps: '4–6', defaultWeight: 140, defaultRestSec: 240,
    tip: 'Bar over mid-foot. Brace 360° before unracking. Limit to 3 heavy sets — high CNS cost warrants lower volume.',
  },
  {
    id: 'lat_pulldown',
    name: 'Lat Pulldown',
    muscles: ['Back'], secondary: ['Biceps'],
    mechanic: 'compound', equipment: 'cable',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 70, defaultRestSec: 120,
    tip: 'Lean back slightly. Full stretch at top (scapular elevation) before pulling. RIR 1–2 for hypertrophy stimulus.',
  },
  {
    id: 'cable_row',
    name: 'Seated Cable Row',
    muscles: ['Back'], secondary: ['Biceps'],
    mechanic: 'compound', equipment: 'cable',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 65, defaultRestSec: 120,
    tip: 'Use a neutral-grip handle. Allow full shoulder protraction at start — maximises lat stretch and activation.',
  },
  {
    id: 'face_pulls',
    name: 'Face Pulls',
    muscles: ['Rear Delts'], secondary: ['External Rotators'],
    mechanic: 'isolation', equipment: 'cable',
    defaultSets: 3, defaultReps: '15–20', defaultWeight: 20, defaultRestSec: 60,
    tip: 'Rope to eye level, elbows high. Trains often-neglected posterior cuff. Critical for shoulder health in pressing athletes.',
  },
  {
    id: 'pullup',
    name: 'Pull-ups',
    muscles: ['Back'], secondary: ['Biceps'],
    mechanic: 'compound', equipment: 'bodyweight',
    defaultSets: 3, defaultReps: '6–10', defaultWeight: 0, defaultRestSec: 120,
    tip: 'Full dead hang between reps. Depress and retract scapula before initiating pull. Add weight once 10+ reps easy.',
  },
  {
    id: 'single_arm_db_row',
    name: 'Single-Arm DB Row',
    muscles: ['Back'], secondary: ['Biceps'],
    mechanic: 'compound', equipment: 'dumbbell',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 40, defaultRestSec: 90,
    tip: 'Brace on bench, keep spine neutral. Allow full elbow extension at bottom for maximum lat stretch.',
  },

  // ── SHOULDERS ─────────────────────────────────────────────────────────
  {
    id: 'ohp',
    name: 'Overhead Press (OHP)',
    muscles: ['Shoulders'], secondary: ['Triceps'],
    mechanic: 'compound', equipment: 'barbell',
    defaultSets: 4, defaultReps: '6–8', defaultWeight: 60, defaultRestSec: 180,
    tip: 'Bar path slightly back. Squeeze glutes to protect lumbar. Primary driver of anterior/medial delt strength — keep in every push session.',
  },
  {
    id: 'lateral_raises',
    name: 'Lateral Raises',
    muscles: ['Shoulders'], secondary: [],
    mechanic: 'isolation', equipment: 'dumbbell',
    defaultSets: 4, defaultReps: '12–15', defaultWeight: 12, defaultRestSec: 90,
    tip: 'Slight internal rotation (thumbs down) increases medial delt activation. RP recommends 15–25 sets/wk for capped shoulders. High reps (15-20) advantageous — medial delt tolerates volume well.',
  },
  {
    id: 'rear_delt_fly',
    name: 'Rear Delt Fly',
    muscles: ['Rear Delts'], secondary: [],
    mechanic: 'isolation', equipment: 'dumbbell',
    defaultSets: 3, defaultReps: '15–20', defaultWeight: 8, defaultRestSec: 60,
    tip: 'Chest-supported removes lower back from the equation. Keep elbows soft. Often undertrained — Israetel MEV for rear delts: 6 sets/wk.',
  },
  {
    id: 'arnold_press',
    name: 'Arnold Press',
    muscles: ['Shoulders'], secondary: ['Triceps'],
    mechanic: 'compound', equipment: 'dumbbell',
    defaultSets: 3, defaultReps: '8–10', defaultWeight: 24, defaultRestSec: 120,
    tip: 'Rotational path hits all three delt heads across the ROM. Particularly effective for anterior and medial delt development.',
  },
  {
    id: 'cable_lateral',
    name: 'Cable Lateral Raise',
    muscles: ['Shoulders'], secondary: [],
    mechanic: 'isolation', equipment: 'cable',
    defaultSets: 3, defaultReps: '15–20', defaultWeight: 10, defaultRestSec: 60,
    tip: 'Cable maintains constant tension throughout. Superior to DBs at the bottom of the ROM where max tension is needed.',
  },

  // ── BICEPS ────────────────────────────────────────────────────────────
  {
    id: 'bb_curl',
    name: 'Barbell Curl',
    muscles: ['Biceps'], secondary: ['Forearms'],
    mechanic: 'isolation', equipment: 'barbell',
    defaultSets: 3, defaultReps: '8–12', defaultWeight: 40, defaultRestSec: 90,
    tip: 'Full elbow extension at bottom — short ROM curls reduce long-head tension. Supinated grip throughout for maximal activation.',
  },
  {
    id: 'incline_db_curl',
    name: 'Incline DB Curl',
    muscles: ['Biceps'], secondary: [],
    mechanic: 'isolation', equipment: 'dumbbell',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 14, defaultRestSec: 90,
    tip: 'The incline position creates a stretched position for the long head. Schoenfeld (2021): exercises with maximal stretch produce greater hypertrophy.',
  },
  {
    id: 'hammer_curl',
    name: 'Hammer Curl',
    muscles: ['Biceps'], secondary: ['Forearms'],
    mechanic: 'isolation', equipment: 'dumbbell',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 16, defaultRestSec: 90,
    tip: 'Neutral grip trains brachialis (under biceps) and brachioradialis — adds thickness to arm girth. Alternate arms for focus.',
  },
  {
    id: 'cable_curl',
    name: 'Cable Curl',
    muscles: ['Biceps'], secondary: [],
    mechanic: 'isolation', equipment: 'cable',
    defaultSets: 3, defaultReps: '12–15', defaultWeight: 30, defaultRestSec: 90,
    tip: 'Low-cable maintains peak tension at full supination. Use EZ bar attachment to reduce wrist strain. Good finisher.',
  },

  // ── TRICEPS ───────────────────────────────────────────────────────────
  {
    id: 'close_grip_bench',
    name: 'Close-Grip Bench Press',
    muscles: ['Triceps'], secondary: ['Chest', 'Shoulders'],
    mechanic: 'compound', equipment: 'barbell',
    defaultSets: 3, defaultReps: '8–10', defaultWeight: 70, defaultRestSec: 120,
    tip: 'Hands shoulder-width (not too close — wrist strain). Keeps elbows tucked. Best compound tricep builder per unit of shoulder stress.',
  },
  {
    id: 'tricep_pushdowns',
    name: 'Tricep Pushdowns',
    muscles: ['Triceps'], secondary: [],
    mechanic: 'isolation', equipment: 'cable',
    defaultSets: 4, defaultReps: '10–12', defaultWeight: 30, defaultRestSec: 60,
    tip: 'Lock elbows at sides. Full elbow extension with slight wrist pronation. Straight bar or V-bar — both effective.',
  },
  {
    id: 'overhead_tri_ext',
    name: 'Overhead Tricep Extension',
    muscles: ['Triceps'], secondary: [],
    mechanic: 'isolation', equipment: 'cable',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 20, defaultRestSec: 90,
    tip: 'Overhead position places long head in stretch — Maeo et al. (2021) showed 40% greater long-head hypertrophy vs pushdowns alone.',
  },
  {
    id: 'skull_crushers',
    name: 'Skull Crushers',
    muscles: ['Triceps'], secondary: [],
    mechanic: 'isolation', equipment: 'barbell',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 30, defaultRestSec: 90,
    tip: 'EZ bar reduces wrist strain. Lower to forehead OR crown. At end of pressing sessions as isolation — not as primary mover.',
  },

  // ── QUADS ─────────────────────────────────────────────────────────────
  {
    id: 'back_squat',
    name: 'Barbell Back Squat',
    muscles: ['Quads'], secondary: ['Hamstrings', 'Glutes', 'Core'],
    mechanic: 'compound', equipment: 'barbell',
    defaultSets: 4, defaultReps: '5–7', defaultWeight: 120, defaultRestSec: 240,
    tip: 'Brace hard, knees tracking toes. RP: squats MEV = 4 sets/wk for quads. Descend to at least parallel for full VMO activation.',
  },
  {
    id: 'leg_press',
    name: 'Leg Press',
    muscles: ['Quads'], secondary: ['Hamstrings', 'Glutes'],
    mechanic: 'compound', equipment: 'machine',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 150, defaultRestSec: 180,
    tip: 'Feet shoulder-width, mid-platform. Full ROM (deep knee flexion). Good high-volume complement to squats — lower spinal load.',
  },
  {
    id: 'bulgarian_squat',
    name: 'Bulgarian Split Squat',
    muscles: ['Quads'], secondary: ['Glutes', 'Hamstrings'],
    mechanic: 'compound', equipment: 'dumbbell',
    defaultSets: 3, defaultReps: '8–10', defaultWeight: 28, defaultRestSec: 120,
    tip: 'Rear foot elevated ~40cm. Front foot far enough that knee tracks over toes without excessive forward lean. Superior quad isolation vs bilateral squat.',
  },
  {
    id: 'hack_squat',
    name: 'Machine Hack Squat',
    muscles: ['Quads'], secondary: ['Glutes'],
    mechanic: 'compound', equipment: 'machine',
    defaultSets: 3, defaultReps: '8–10', defaultWeight: 80, defaultRestSec: 180,
    tip: 'Upright torso hits quads harder than back squat. Feet slightly forward for full depth. Great squat substitute if back is limiting.',
  },
  {
    id: 'leg_extension',
    name: 'Leg Extension',
    muscles: ['Quads'], secondary: [],
    mechanic: 'isolation', equipment: 'machine',
    defaultSets: 3, defaultReps: '12–15', defaultWeight: 55, defaultRestSec: 90,
    tip: 'Full extension required for VMO emphasis. Bodybuilders often train quad isolation in lengthened position — partial reps at bottom ROM.',
  },

  // ── HAMSTRINGS ────────────────────────────────────────────────────────
  {
    id: 'rdl',
    name: 'Romanian Deadlift',
    muscles: ['Hamstrings'], secondary: ['Glutes', 'Back'],
    mechanic: 'compound', equipment: 'barbell',
    defaultSets: 3, defaultReps: '8–10', defaultWeight: 90, defaultRestSec: 180,
    tip: 'Hip hinge, not a squat. Bar skims legs throughout. Push hips back until strong hamstring stretch, then drive forward. RP: RDL is the cornerstone hamstring exercise.',
  },
  {
    id: 'lying_leg_curl',
    name: 'Lying Leg Curl',
    muscles: ['Hamstrings'], secondary: [],
    mechanic: 'isolation', equipment: 'machine',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 45, defaultRestSec: 90,
    tip: 'Hip extension position pre-stretches the hamstrings. Full ROM — squeeze at top. Maeo et al.: lengthened-position training superior for hamstring hypertrophy.',
  },
  {
    id: 'seated_leg_curl',
    name: 'Seated Leg Curl',
    muscles: ['Hamstrings'], secondary: [],
    mechanic: 'isolation', equipment: 'machine',
    defaultSets: 3, defaultReps: '12–15', defaultWeight: 40, defaultRestSec: 90,
    tip: 'Hip flexion position places hamstrings in lengthened stretch — optimal for hypertrophy per muscle length research (2021–2023).',
  },

  // ── GLUTES ────────────────────────────────────────────────────────────
  {
    id: 'hip_thrust',
    name: 'Barbell Hip Thrust',
    muscles: ['Glutes'], secondary: ['Hamstrings'],
    mechanic: 'compound', equipment: 'barbell',
    defaultSets: 3, defaultReps: '10–12', defaultWeight: 80, defaultRestSec: 120,
    tip: 'Upper back on bench, feet flat. Full hip extension at top with posterior pelvic tilt. Contreras (2015): hip thrust produces the highest glute EMG of any exercise.',
  },

  // ── CALVES ────────────────────────────────────────────────────────────
  {
    id: 'standing_calf_raise',
    name: 'Standing Calf Raise',
    muscles: ['Calves'], secondary: [],
    mechanic: 'isolation', equipment: 'machine',
    defaultSets: 4, defaultReps: '12–15', defaultWeight: 80, defaultRestSec: 60,
    tip: 'Full ROM — deep stretch at bottom. Gastrocnemius (the meaty head) is optimally trained with straight knee. Calves respond better to high reps due to fibre type composition.',
  },
  {
    id: 'seated_calf_raise',
    name: 'Seated Calf Raise',
    muscles: ['Calves'], secondary: [],
    mechanic: 'isolation', equipment: 'machine',
    defaultSets: 3, defaultReps: '15–20', defaultWeight: 50, defaultRestSec: 60,
    tip: 'Bent knee isolates soleus (deeper calf). Necessary for full calf development — the soleus is a slow-twitch dominant muscle, responds well to high reps.',
  },
]

export default exercises

export function getExerciseById(id: string): ExerciseTemplate | undefined {
  return exercises.find(e => e.id === id)
}

export function getExercisesByMuscle(muscle: string): ExerciseTemplate[] {
  return exercises.filter(e =>
    e.muscles.some(m => m.toLowerCase() === muscle.toLowerCase())
  )
}

export function getAlternatives(id: string): ExerciseTemplate[] {
  const ex = getExerciseById(id)
  if (!ex) return []
  return exercises.filter(e =>
    e.id !== id &&
    e.muscles.some(m => ex.muscles.includes(m))
  )
}
