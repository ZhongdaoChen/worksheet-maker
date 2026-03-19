'use strict';

// ── Oxford Phonics World Sentence Bank ────────────────────────────────────────
//
// Each entry:
//   full  — complete sentence shown to child
//   cloze — same sentence with 1-2 target phonics words replaced by ___
//   level — highest phonics level of target words (1–5)
//
// level guide:
//   1 = alphabet words (cat, dog, fish…)
//   2 = short vowel CVC words
//   3 = magic-e & vowel digraphs
//   4 = consonant blends & digraphs
//   5 = advanced vowel combinations & suffixes

const PHONICS_SENTENCES = [

  // ── Level 1 ──────────────────────────────────────────────────────────────
  { level: 1, full: 'The cat is on the mat.',             cloze: 'The ___ is on the mat.' },
  { level: 1, full: 'I can see a big dog.',               cloze: 'I can see a big ___.' },
  { level: 1, full: 'The bird sits in the tree.',         cloze: 'The ___ sits in the tree.' },
  { level: 1, full: 'She has a red bag.',                 cloze: 'She has a red ___.' },
  { level: 1, full: 'A fish lives in the sea.',           cloze: 'A ___ lives in the sea.' },
  { level: 1, full: 'The monkey eats a banana.',          cloze: 'The ___ eats a banana.' },
  { level: 1, full: 'My dog has a big hat.',              cloze: 'My ___ has a big hat.' },
  { level: 1, full: 'The lion is very big.',              cloze: 'The ___ is very big.' },
  { level: 1, full: 'A rabbit can jump very high.',       cloze: 'A ___ can jump very high.' },
  { level: 1, full: 'The penguin lives on the ice.',      cloze: 'The ___ lives on the ice.' },
  { level: 1, full: 'I like to eat an apple.',            cloze: 'I like to eat an ___.' },
  { level: 1, full: 'The duck swims in the pond.',        cloze: 'The ___ swims in the pond.' },
  { level: 1, full: 'A bear has soft brown fur.',         cloze: 'A ___ has soft brown fur.' },
  { level: 1, full: 'The tiger is fast and strong.',      cloze: 'The ___ is fast and strong.' },
  { level: 1, full: 'She put the egg in the bowl.',       cloze: 'She put the ___ in the bowl.' },
  { level: 1, full: 'The frog jumps off the log.',        cloze: 'The frog jumps off the ___.' },
  { level: 1, full: 'I can see the moon at night.',       cloze: 'I can see the ___ at night.' },
  { level: 1, full: 'A zebra has black and white stripes.', cloze: 'A ___ has black and white stripes.' },
  { level: 1, full: 'The panda eats green bamboo.',       cloze: 'The ___ eats green bamboo.' },
  { level: 1, full: 'My cat sleeps on the bed.',          cloze: 'My ___ sleeps on the bed.' },

  // ── Level 2 ──────────────────────────────────────────────────────────────
  { level: 2, full: 'The fat cat sat on the mat.',        cloze: 'The fat ___ sat on the ___.' },
  { level: 2, full: 'A big bug is in the jug.',           cloze: 'A big ___ is in the ___.' },
  { level: 2, full: 'The hen has ten eggs in her nest.',  cloze: 'The ___ has ten eggs in her ___.' },
  { level: 2, full: 'I put the pan on the hot pot.',      cloze: 'I put the ___ on the hot ___.' },
  { level: 2, full: 'The dog dug a hole in the mud.',     cloze: 'The dog dug a hole in the ___.' },
  { level: 2, full: 'A red hen sat on the bed.',          cloze: 'A ___ hen sat on the ___.' },
  { level: 2, full: 'The rat ran to get the jam.',        cloze: 'The ___ ran to get the ___.' },
  { level: 2, full: 'I can hop and skip on one leg.',     cloze: 'I can ___ and skip on one leg.' },
  { level: 2, full: 'The pup ran in the mud.',            cloze: 'The ___ ran in the ___.' },
  { level: 2, full: 'She cut the bun with a big knife.',  cloze: 'She cut the ___ with a big knife.' },
  { level: 2, full: 'A wet pet sat on the vet\'s lap.',   cloze: 'A wet ___ sat on the vet\'s lap.' },
  { level: 2, full: 'I can fit this lid on the pot.',     cloze: 'I can fit this ___ on the ___.' },
  { level: 2, full: 'The mop fell into the big tub.',     cloze: 'The ___ fell into the big ___.' },
  { level: 2, full: 'He got the map from his bag.',       cloze: 'He got the ___ from his bag.' },
  { level: 2, full: 'Six big ants ran up the hill.',      cloze: '___ big ants ran up the hill.' },
  { level: 2, full: 'The cub sat next to its mum.',       cloze: 'The ___ sat next to its mum.' },
  { level: 2, full: 'She fed the hens on the farm.',      cloze: 'She fed the ___ on the farm.' },
  { level: 2, full: 'A fish can swim but not run.',       cloze: 'A ___ can swim but not run.' },
  { level: 2, full: 'The kid hid the lid in the box.',    cloze: 'The ___ hid the ___ in the box.' },
  { level: 2, full: 'Mum put jam on the hot bun.',        cloze: 'Mum put ___ on the hot ___.' },

  // ── Level 3 ──────────────────────────────────────────────────────────────
  { level: 3, full: 'She can ride her bike to the lake.', cloze: 'She can ride her ___ to the ___.' },
  { level: 3, full: 'The cake is on the big white plate.', cloze: 'The ___ is on the big white plate.' },
  { level: 3, full: 'He flew his kite in the blue sky.',  cloze: 'He flew his ___ in the blue ___.' },
  { level: 3, full: 'The rain fell on the green lane.',   cloze: 'The ___ fell on the green lane.' },
  { level: 3, full: 'We saw a bee near the rose tree.',   cloze: 'We saw a ___ near the rose tree.' },
  { level: 3, full: 'A snail left a trail in the rain.',  cloze: 'A snail left a ___ in the ___.' },
  { level: 3, full: 'She ate meat and peas for lunch.',   cloze: 'She ate ___ and peas for lunch.' },
  { level: 3, full: 'The goat sat by the road.',          cloze: 'The ___ sat by the ___.' },
  { level: 3, full: 'I can see the moon shine on the lake.', cloze: 'I can see the ___ shine on the ___.' },
  { level: 3, full: 'He woke up at nine and ate a plum.', cloze: 'He woke up at ___ and ate a plum.' },
  { level: 3, full: 'The leaf fell from the big tree.',   cloze: 'The ___ fell from the big tree.' },
  { level: 3, full: 'She made a cute toy for the baby.',  cloze: 'She made a ___ toy for the baby.' },
  { level: 3, full: 'A wave hit the side of the boat.',   cloze: 'A ___ hit the side of the ___.' },
  { level: 3, full: 'The boy plays in the hay all day.',  cloze: 'The boy plays in the ___ all day.' },
  { level: 3, full: 'We saw five bees in the rose bush.', cloze: 'We saw ___ bees in the rose bush.' },
  { level: 3, full: 'She skates on the ice every day.',   cloze: 'She ___ on the ice every day.' },
  { level: 3, full: 'The snake is long and lives in a hole.', cloze: 'The ___ is long and lives in a hole.' },
  { level: 3, full: 'A blue boat sailed across the sea.', cloze: 'A ___ boat sailed across the sea.' },
  { level: 3, full: 'He gave his mum a red rose.',        cloze: 'He gave his mum a red ___.' },
  { level: 3, full: 'The seed grew into a big oak tree.', cloze: 'The ___ grew into a big oak tree.' },
  { level: 3, full: 'I like to spy on birds in the sky.', cloze: 'I like to ___ on birds in the ___.' },
  { level: 3, full: 'She put the pie on the window ledge.', cloze: 'She put the ___ on the window ledge.' },
  { level: 3, full: 'The glue on the tube is very sticky.', cloze: 'The ___ on the tube is very sticky.' },
  { level: 3, full: 'My dad said he was happy and proud.', cloze: 'My dad said he was ___ and proud.' },
  { level: 3, full: 'She found a gold coin in the sand.', cloze: 'She found a gold ___ in the sand.' },

  // ── Level 4 ──────────────────────────────────────────────────────────────
  { level: 4, full: 'The crab ran across the wet sand.',  cloze: 'The ___ ran across the wet sand.' },
  { level: 4, full: 'A frog sat on a green log by the pond.', cloze: 'A ___ sat on a green log by the pond.' },
  { level: 4, full: 'She brushed her hair before school.', cloze: 'She ___ her hair before ___.' },
  { level: 4, full: 'The clock on the wall is slow.',     cloze: 'The ___ on the wall is slow.' },
  { level: 4, full: 'He drove the truck down the long road.', cloze: 'He drove the ___ down the long road.' },
  { level: 4, full: 'A big black snake slept in the grass.', cloze: 'A big black ___ slept in the ___.' },
  { level: 4, full: 'The white whale swam in the deep sea.', cloze: 'The white ___ swam in the deep sea.' },
  { level: 4, full: 'She played with the drum in the band.', cloze: 'She played with the ___ in the band.' },
  { level: 4, full: 'The queen wears a shiny crown.',     cloze: 'The ___ wears a shiny crown.' },
  { level: 4, full: 'He caught a fish with a long stick.', cloze: 'He ___ a fish with a long stick.' },
  { level: 4, full: 'A green frog sat on the flat rock.', cloze: 'A green ___ sat on the flat rock.' },
  { level: 4, full: 'She had lunch with her mother.',     cloze: 'She had ___ with her ___.' },
  { level: 4, full: 'The ship sailed past the rocky cliff.', cloze: 'The ___ sailed past the rocky cliff.' },
  { level: 4, full: 'He wore a blue dress to the party.', cloze: 'He wore a blue ___ to the party.' },
  { level: 4, full: 'The duck swam next to its three chicks.', cloze: 'The ___ swam next to its three ___.' },
  { level: 4, full: 'A strong wind blew the flag away.',  cloze: 'A strong ___ blew the ___ away.' },
  { level: 4, full: 'She planted a small tree in the spring.', cloze: 'She planted a small ___ in the spring.' },
  { level: 4, full: 'The smoke rose from the chimney.',   cloze: 'The ___ rose from the chimney.' },
  { level: 4, full: 'He brushed his teeth three times a day.', cloze: 'He brushed his ___ three times a day.' },
  { level: 4, full: 'A little chick pecked at the seed.',  cloze: 'A little ___ pecked at the seed.' },
  { level: 4, full: 'She stepped on the glass by mistake.', cloze: 'She stepped on the ___ by mistake.' },
  { level: 4, full: 'The school bell rang at three o\'clock.', cloze: 'The ___ bell rang at three o\'clock.' },
  { level: 4, full: 'He stamped his feet and clapped his hands.', cloze: 'He ___ his feet and clapped his hands.' },
  { level: 4, full: 'The dolphin swam fast in the blue sea.', cloze: 'The ___ swam fast in the blue sea.' },
  { level: 4, full: 'A squid lives deep in the dark ocean.', cloze: 'A ___ lives deep in the dark ocean.' },

  // ── Level 5 ──────────────────────────────────────────────────────────────
  { level: 5, full: 'The nurse cared for the sick child.', cloze: 'The ___ cared for the sick ___.' },
  { level: 5, full: 'A girl and her sister walked to the park.', cloze: 'A ___ and her ___ walked to the park.' },
  { level: 5, full: 'The brown cow stood near the old barn.', cloze: 'The brown ___ stood near the old barn.' },
  { level: 5, full: 'She drew a picture of a horse.',      cloze: 'She drew a ___ of a ___.' },
  { level: 5, full: 'The doctor said to drink lots of water.', cloze: 'The ___ said to drink lots of ___.' },
  { level: 5, full: 'He found a coin at the bottom of the fountain.', cloze: 'He found a ___ at the bottom of the fountain.' },
  { level: 5, full: 'The music in the hall was very beautiful.', cloze: 'The ___ in the hall was very ___.' },
  { level: 5, full: 'A baby panda is small and very cute.',  cloze: 'A baby ___ is small and very cute.' },
  { level: 5, full: 'She found a purple flower near the castle.', cloze: 'She found a ___ flower near the ___.' },
  { level: 5, full: 'The farmer drove his tractor across the field.', cloze: 'The farmer drove his ___ across the field.' },
  { level: 5, full: 'He wrote a letter to his uncle.',     cloze: 'He ___ a letter to his uncle.' },
  { level: 5, full: 'The children played on a tall slide.', cloze: 'The ___ played on a tall ___.' },
  { level: 5, full: 'A deer stood still in the morning mist.', cloze: 'A ___ stood still in the morning mist.' },
  { level: 5, full: 'She shared her bread with the bird.',  cloze: 'She ___ her ___ with the bird.' },
  { level: 5, full: 'My mother is kind, helpful, and clever.', cloze: 'My mother is kind, ___, and clever.' },
  { level: 5, full: 'The gorilla climbed to the top of the tree.', cloze: 'The ___ climbed to the top of the tree.' },
  { level: 5, full: 'She cut her knee when she fell on the path.', cloze: 'She cut her ___ when she fell on the path.' },
  { level: 5, full: 'It is dangerous to run near the pool.', cloze: 'It is ___ to run near the pool.' },
  { level: 5, full: 'The picture on the wall is very colourful.', cloze: 'The ___ on the wall is very colourful.' },
  { level: 5, full: 'He found a treasure chest in the old cave.', cloze: 'He found a ___ chest in the old cave.' },
  { level: 5, full: 'The rhino drank water from the river.', cloze: 'The ___ drank ___ from the river.' },
  { level: 5, full: 'A lamb ran across the green meadow.',  cloze: 'A ___ ran across the green meadow.' },
  { level: 5, full: 'She wore a glove on each hand in the snow.', cloze: 'She wore a ___ on each hand in the snow.' },
  { level: 5, full: 'The television show made everyone laugh.', cloze: 'The ___ show made everyone laugh.' },
  { level: 5, full: 'He surprised his sister with a nice cake.', cloze: 'He ___ his sister with a nice cake.' },
];
