export const BODY_PARTS = [
  { id: 'chest', name: 'Chest' },
  { id: 'back', name: 'Back' },
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'arms', name: 'Arms' },
  { id: 'legs', name: 'Legs' },
  { id: 'glutes', name: 'Glutes' },
  { id: 'core', name: 'Core' },
  { id: 'cardio', name: 'Cardio' },
  { id: 'olympic', name: 'Olympic' },
  { id: 'full-body', name: 'Full body' },
];

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseExercises(raw) {
  const seen = new Map();
  return raw
    .trim()
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [bodyPart, name, equipment] = line.split('|');
      let id = slug(name);
      const count = (seen.get(id) || 0) + 1;
      seen.set(id, count);
      if (count > 1) id = `${id}-${count}`;
      return {
        id,
        name,
        bodyPart,
        equipment: equipment || 'Other',
        videoPlaceholder: true,
      };
    });
}

// bodyPart|name|equipment
const RAW = `
chest|Barbell Bench Press|Barbell
chest|Incline Barbell Bench Press|Barbell
chest|Decline Barbell Bench Press|Barbell
chest|Dumbbell Bench Press|Dumbbell
chest|Incline Dumbbell Press|Dumbbell
chest|Decline Dumbbell Press|Dumbbell
chest|Dumbbell Fly|Dumbbell
chest|Incline Dumbbell Fly|Dumbbell
chest|Cable Fly|Cable
chest|Low Cable Crossover|Cable
chest|High Cable Crossover|Cable
chest|Push-Up|Bodyweight
chest|Decline Push-Up|Bodyweight
chest|Incline Push-Up|Bodyweight
chest|Diamond Push-Up|Bodyweight
chest|Wide-Grip Push-Up|Bodyweight
chest|Chest Dip|Bodyweight
chest|Machine Chest Press|Machine
chest|Pec Deck|Machine
chest|Landmine Press|Barbell
chest|Svend Press|Plate
chest|Floor Press|Barbell
chest|Smith Machine Bench Press|Smith
chest|Pause Bench Press|Barbell
back|Conventional Deadlift|Barbell
back|Pull-Up|Bodyweight
back|Chin-Up|Bodyweight
back|Wide-Grip Pull-Up|Bodyweight
back|Neutral-Grip Pull-Up|Bodyweight
back|Lat Pulldown|Cable
back|Close-Grip Lat Pulldown|Cable
back|Reverse-Grip Lat Pulldown|Cable
back|Seated Cable Row|Cable
back|Bent-Over Barbell Row|Barbell
back|Pendlay Row|Barbell
back|One-Arm Dumbbell Row|Dumbbell
back|Chest-Supported Row|Dumbbell
back|T-Bar Row|Barbell
back|Meadows Row|Barbell
back|Straight-Arm Pulldown|Cable
back|Inverted Row|Bodyweight
back|Face Pull|Cable
back|Rack Pull|Barbell
back|Hyperextension|Bodyweight
back|Trap Bar Deadlift|Trap bar
back|Seal Row|Barbell
back|Cable Pullover|Cable
back|Single-Arm Cable Row|Cable
back|Wide-Grip Seated Row|Cable
shoulders|Barbell Overhead Press|Barbell
shoulders|Dumbbell Shoulder Press|Dumbbell
shoulders|Arnold Press|Dumbbell
shoulders|Seated Dumbbell Press|Dumbbell
shoulders|Lateral Raise|Dumbbell
shoulders|Cable Lateral Raise|Cable
shoulders|Front Raise|Dumbbell
shoulders|Rear Delt Fly|Dumbbell
shoulders|Reverse Pec Deck|Machine
shoulders|Upright Row|Barbell
shoulders|Push Press|Barbell
shoulders|Machine Shoulder Press|Machine
shoulders|Pike Push-Up|Bodyweight
shoulders|Handstand Push-Up|Bodyweight
shoulders|Dumbbell Shrug|Dumbbell
shoulders|Barbell Shrug|Barbell
shoulders|Landmine Shoulder Press|Barbell
shoulders|Cuban Rotation|Dumbbell
shoulders|Bradford Press|Barbell
shoulders|Y Raise|Dumbbell
shoulders|Cable Rear Delt Fly|Cable
shoulders|Seated Arnold Press|Dumbbell
arms|Barbell Curl|Barbell
arms|EZ-Bar Curl|EZ bar
arms|Dumbbell Curl|Dumbbell
arms|Hammer Curl|Dumbbell
arms|Incline Dumbbell Curl|Dumbbell
arms|Preacher Curl|EZ bar
arms|Concentration Curl|Dumbbell
arms|Cable Curl|Cable
arms|Reverse Curl|Barbell
arms|Spider Curl|EZ bar
arms|Tricep Pushdown|Cable
arms|Rope Pushdown|Cable
arms|Skull Crusher|EZ bar
arms|Overhead Tricep Extension|Dumbbell
arms|Overhead Cable Extension|Cable
arms|Close-Grip Bench Press|Barbell
arms|Tricep Dip|Bodyweight
arms|Kickback|Dumbbell
arms|JM Press|Barbell
arms|Wrist Curl|Barbell
arms|Reverse Wrist Curl|Barbell
arms|Bench Dip|Bodyweight
arms|Cable Hammer Curl|Cable
arms|Lying Tricep Extension|EZ bar
legs|Back Squat|Barbell
legs|Front Squat|Barbell
legs|Goblet Squat|Dumbbell
legs|Pause Squat|Barbell
legs|Box Squat|Barbell
legs|Hack Squat|Machine
legs|Leg Press|Machine
legs|Bulgarian Split Squat|Dumbbell
legs|Walking Lunge|Dumbbell
legs|Reverse Lunge|Dumbbell
legs|Step-Up|Dumbbell
legs|Leg Extension|Machine
legs|Lying Leg Curl|Machine
legs|Seated Leg Curl|Machine
legs|Romanian Deadlift|Barbell
legs|Stiff-Leg Deadlift|Barbell
legs|Nordic Hamstring Curl|Bodyweight
legs|Standing Calf Raise|Machine
legs|Seated Calf Raise|Machine
legs|Sissy Squat|Bodyweight
legs|Pistol Squat|Bodyweight
legs|Wall Sit|Bodyweight
legs|Adductor Machine|Machine
legs|Abductor Machine|Machine
legs|Smith Machine Squat|Smith
legs|Walking Weighted Lunge|Barbell
glutes|Barbell Hip Thrust|Barbell
glutes|Dumbbell Hip Thrust|Dumbbell
glutes|Glute Bridge|Bodyweight
glutes|Single-Leg Glute Bridge|Bodyweight
glutes|Frog Pump|Bodyweight
glutes|Cable Kickback|Cable
glutes|Donkey Kick|Bodyweight
glutes|Fire Hydrant|Bodyweight
glutes|Sumo Deadlift|Barbell
glutes|Deficit Reverse Lunge|Dumbbell
glutes|Curtsy Lunge|Dumbbell
glutes|Smith Machine Hip Thrust|Smith
glutes|Reverse Hyper|Machine
glutes|Banded Lateral Walk|Band
glutes|Clamshell|Band
glutes|B-Stance Hip Thrust|Barbell
glutes|Kickback on Smith|Smith
glutes|Good Morning|Barbell
glutes|Single-Leg Hip Thrust|Dumbbell
glutes|Sumo Stance Goblet Squat|Dumbbell
core|Plank|Bodyweight
core|Side Plank|Bodyweight
core|Crunch|Bodyweight
core|Bicycle Crunch|Bodyweight
core|Sit-Up|Bodyweight
core|Lying Leg Raise|Bodyweight
core|Hanging Leg Raise|Bodyweight
core|Captain's Chair Knee Raise|Machine
core|Russian Twist|Bodyweight
core|Ab Wheel Rollout|Wheel
core|Dead Bug|Bodyweight
core|Bird Dog|Bodyweight
core|Cable Crunch|Cable
core|Pallof Press|Cable
core|Woodchop|Cable
core|Hollow Hold|Bodyweight
core|V-Up|Bodyweight
core|Toe Touch|Bodyweight
core|Dragon Flag|Bodyweight
core|Copenhagen Plank|Bodyweight
core|Hanging Knee Raise|Bodyweight
core|Decline Sit-Up|Bodyweight
cardio|Treadmill Run|Machine
cardio|Treadmill Incline Walk|Machine
cardio|Outdoor Run|None
cardio|Sprint Intervals|None
cardio|Stationary Bike|Machine
cardio|Assault Bike|Machine
cardio|Cycling Outdoors|Bike
cardio|Rowing Machine|Machine
cardio|Elliptical|Machine
cardio|Stair Climber|Machine
cardio|Jump Rope|Rope
cardio|Battle Ropes|Rope
cardio|Swimming|None
cardio|Hiking|None
cardio|Jumping Jacks|Bodyweight
cardio|High Knees|Bodyweight
cardio|Box Jump|Plyo box
cardio|Burpee Intervals|Bodyweight
cardio|Shadow Boxing|None
cardio|Stair Sprints|None
cardio|Row Erg Intervals|Machine
cardio|Incline Treadmill Intervals|Machine
olympic|Snatch|Barbell
olympic|Power Snatch|Barbell
olympic|Hang Snatch|Barbell
olympic|Muscle Snatch|Barbell
olympic|Clean|Barbell
olympic|Power Clean|Barbell
olympic|Hang Clean|Barbell
olympic|Clean and Jerk|Barbell
olympic|Push Jerk|Barbell
olympic|Split Jerk|Barbell
olympic|Clean Pull|Barbell
olympic|Snatch Pull|Barbell
olympic|Overhead Squat|Barbell
olympic|High Pull|Barbell
olympic|Dumbbell Snatch|Dumbbell
olympic|Kettlebell Snatch|Kettlebell
olympic|Hang Power Clean|Barbell
olympic|Hang Power Snatch|Barbell
full-body|Burpee|Bodyweight
full-body|Thruster|Barbell
full-body|Kettlebell Swing|Kettlebell
full-body|Man Maker|Dumbbell
full-body|Clean and Press|Barbell
full-body|Farmer Carry|Dumbbell
full-body|Sled Push|Sled
full-body|Sled Pull|Sled
full-body|Wall Ball|Med ball
full-body|Devil Press|Dumbbell
full-body|Turkish Get-Up|Kettlebell
full-body|Bear Crawl|Bodyweight
full-body|Medicine Ball Slam|Med ball
full-body|Jumping Jack|Bodyweight
full-body|Dumbbell Complex|Dumbbell
full-body|Sandbag Carry|Sandbag
full-body|Mountain Climber|Bodyweight
full-body|Battle Rope Waves|Rope
full-body|Kettlebell Clean and Press|Kettlebell
full-body|Dumbbell Push-Up Row|Dumbbell
`;

export const EXERCISES = parseExercises(RAW);

export function getExercise(id) {
  return EXERCISES.find((e) => e.id === id) || null;
}

export function exercisesByPart(partId) {
  return EXERCISES.filter((e) => e.bodyPart === partId);
}

export function bodyPartName(id) {
  return BODY_PARTS.find((p) => p.id === id)?.name || id;
}

export function isCardio(exercise) {
  return exercise?.bodyPart === 'cardio';
}
