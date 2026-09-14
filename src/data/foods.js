function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseFoods(raw) {
  const seen = new Map();
  return raw
    .trim()
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [name, serving, calories, carbs, protein, fat] = line.split('|');
      let id = slug(name);
      const count = (seen.get(id) || 0) + 1;
      seen.set(id, count);
      if (count > 1) id = `${id}-${count}`;
      return {
        id,
        name,
        serving,
        calories: Number(calories),
        carbs: Number(carbs),
        protein: Number(protein),
        fat: Number(fat),
        custom: false,
      };
    });
}

// name|serving|calories|carbs|protein|fat — common foods, approximate per serving
const RAW = `
Egg (large)|1 large|72|0.4|6.3|4.8
Egg whites|3 whites|51|0.7|11|0.2
Scrambled eggs|2 large eggs|182|1.6|12.2|13.5
Oatmeal, cooked|1 cup|166|28|6|3.6
Overnight oats|1 cup|220|36|8|5
Granola|1/2 cup|240|32|6|10
Greek yogurt, plain|1 cup (170g)|100|6|17|0.7
Greek yogurt, vanilla|1 cup|150|17|15|2
Cottage cheese|1 cup|206|7|28|9
Banana|1 medium|105|27|1.3|0.4
Apple|1 medium|95|25|0.5|0.3
Blueberries|1 cup|84|21|1.1|0.5
Strawberries|1 cup|49|12|1|0.5
Mixed berries|1 cup|70|17|1|0.4
Avocado|1/2 fruit|120|6|1.5|11
Whole wheat toast|1 slice|81|14|4|1.1
Sourdough toast|1 slice|88|17|3.5|0.6
Bagel, plain|1 medium|277|55|11|1.4
English muffin|1 muffin|134|26|4.4|1
Peanut butter|2 tbsp|188|6|8|16
Almond butter|2 tbsp|196|6|6.7|18
Butter|1 tbsp|102|0|0.1|12
Olive oil|1 tbsp|119|0|0|14
Protein shake (whey)|1 scoop in water|120|3|24|1.5
Whey protein powder|1 scoop|120|3|24|1.5
Turkey sausage|2 links|140|1|12|10
Bacon|2 slices|86|0.2|6|6.6
Hash browns|1 cup|326|38|3.5|18
Pancakes|2 medium|175|30|5|4
Waffle|1 round|218|25|6|11
Cheerios|1 cup|100|20|3|2
Milk, 2%|1 cup|122|12|8|5
Almond milk, unsweetened|1 cup|30|1|1|2.5
Orange juice|1 cup|112|26|1.7|0.5
Black coffee|12 oz|2|0|0.3|0
Latte, whole milk|12 oz|150|12|8|8
Berry smoothie|12 oz|210|38|8|3
Chicken breast, cooked|4 oz|187|0|35|4
Chicken thigh, cooked|4 oz|210|0|26|11
Ground turkey, 93%|4 oz cooked|170|0|22|8
Ground beef, 90%|4 oz cooked|199|0|25|11
Sirloin steak|4 oz cooked|206|0|31|8
Salmon, cooked|4 oz|233|0|25|14
Tuna, canned in water|1 can (5 oz)|121|0|27|0.8
Shrimp, cooked|4 oz|120|1|23|1.7
Pork tenderloin|4 oz cooked|163|0|28|4.8
Cod, baked|4 oz|105|0|23|0.9
Tofu, firm|4 oz|94|2|10|6
Tempeh|3 oz|162|8|17|9
Edamame|1 cup|188|14|18|8
Black beans|1 cup|227|41|15|0.9
Chickpeas|1 cup|269|45|15|4.2
Lentils, cooked|1 cup|230|40|18|0.8
Turkey breast, sliced|3 oz|90|1|18|1.2
Deli turkey|3 oz|90|2|16|1
Protein bar|1 bar|200|22|20|6
White rice, cooked|1 cup|205|45|4.3|0.4
Brown rice, cooked|1 cup|216|45|5|1.8
Quinoa, cooked|1 cup|222|39|8|3.6
Pasta, cooked|1 cup|220|43|8|1.3
Whole wheat pasta|1 cup|174|37|7.5|0.8
Potato, baked|1 medium|161|37|4.3|0.2
Sweet potato, baked|1 medium|103|24|2.3|0.2
Flour tortilla|1 large|146|25|4|3.7
Corn tortilla|2 small|104|22|2.6|1.4
Rice cake|1 cake|35|7|0.7|0.3
Couscous, cooked|1 cup|176|36|6|0.3
Broccoli, cooked|1 cup|55|11|3.7|0.6
Spinach, raw|2 cups|14|2.2|1.8|0.2
Mixed salad greens|2 cups|16|3|1.2|0.2
Asparagus|1 cup|40|7|4.3|0.4
Green beans|1 cup|44|10|2.4|0.2
Carrots|1 cup|52|12|1.2|0.3
Tomato|1 medium|22|5|1.1|0.2
Cucumber|1 cup|16|4|0.7|0.1
Bell pepper|1 medium|31|7|1|0.3
Kale, cooked|1 cup|43|6|3.5|1.5
Mixed vegetables|1 cup|80|15|4|0.5
Cheddar cheese|1 oz|113|0.4|7|9.3
String cheese|1 stick|80|1|7|6
Almonds|1 oz (23)|164|6|6|14
Walnuts|1 oz|185|4|4.3|18
Cashews|1 oz|157|9|5|12
Dark chocolate|1 oz|170|13|2.2|12
Popcorn, air-popped|3 cups|93|19|3|1.1
Hummus|2 tbsp|70|6|2|5
Guacamole|2 tbsp|50|3|0.6|4.5
Potato chips|1 oz|152|15|2|10
Ice cream, vanilla|1/2 cup|137|16|2.3|7
Greek yogurt parfait|1 cup|190|28|14|3
Grilled chicken salad|1 bowl|320|12|38|14
Turkey sandwich|1 sandwich|350|38|28|10
Protein burrito bowl|1 bowl|540|58|42|16
Cheese pizza slice|1 slice|285|36|12|10
Cheeseburger|1 sandwich|540|40|25|27
Sushi roll (California)|6 pieces|255|38|9|7
Chicken stir fry|1 bowl|380|32|32|12
Chili with beef|1 cup|250|18|20|10
Omelette, 3 egg|1 omelette|280|3|20|21
Water|1 cup (8 oz)|0|0|0|0
Green tea|8 oz|2|0|0|0
Soda, cola|12 oz|140|39|0|0
Chocolate milk|1 cup|208|26|8|8
Orange|1 medium|62|15|1.2|0.2
Grapes|1 cup|104|27|1.1|0.2
Honey|1 tbsp|64|17|0.1|0
Maple syrup|2 tbsp|104|27|0|0
Ketchup|1 tbsp|19|5|0.2|0
Mayonnaise|1 tbsp|94|0.1|0.1|10
Ranch dressing|2 tbsp|129|2|0.4|13
Brown rice bowl with chicken|1 bowl|480|52|38|12
Overnight protein oats|1 jar|310|42|24|6
Tuna salad|1/2 cup|187|9|16|10
Egg white omelette|1 omelette|140|4|22|3
Protein pancakes|2 pancakes|220|24|20|5
Rotisserie chicken|4 oz|190|0|28|8
Bison burger patty|4 oz|190|0|24|10
Tilapia, baked|4 oz|128|0|26|2.7
Skim milk|1 cup|83|12|8|0.2
Whole milk|1 cup|149|12|8|8
Cream cheese|2 tbsp|99|2|2|10
Feta cheese|1 oz|75|1.2|4|6
Olive oil vinaigrette|2 tbsp|120|2|0|13
`;

export const FOODS = parseFoods(RAW);

export function findFood(id) {
  return FOODS.find((f) => f.id === id) || null;
}
