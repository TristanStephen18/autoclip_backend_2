// const variation = 3;
// const num_clips = 10;
// const selected = ["emoji", "cards", "karaoke"];

// for (let start = 1; start <= variation; start++) {
//   for (let startn = 1; startn <= num_clips; startn++) {
//     for (let index = 0; index < selected.length; index++) {
//       console.log(
//         `Variation number: `,
//         start,
//         `\n Clip number: `,
//         startn,
//         `\nContent enhancement: `,
//         selected[index],
//         `\n`
//       );
//     }
//   }
// }

const sampleObjectarray = [
  {
    title: "sample",
    name: "sample",
  },
  {
    title: "title2",
    name: "name3",
  },
];

sampleObjectarray.map((sample) => {
  console.log("Title: ", sample.title, "\nName: ", sample.name);
});

//how about actual clipping? That loop only shows the different combinations or all possible combinations
//of the job. Actual AI clipping is not yet possible.

// Insert in loop --transcription, videos are already saved in the publics folder. One result to transcription to ai clip to remotion template will be the flow of rendering clips
// Stages will be finding all possible combinations store them in an array of maps, loop again for transcription, save the transcription using keys and values
// Keys and values will be used for the AI Clipping

//design changes
//removal of video enhancement options in dashboard (meaning changed in jobs table schema)

//AI clipping process updated
//Removal or content enhancement options in dashboard, just pure clips in dashboard
//Content enhancement will be chosen by the user after clipping to reduce processcomplications
//karaoke style will be built in or the default content enhancement style, the others will be just a more improved version of this since transcriptions of the clips are available
//Management of user clips and videos will be available and analytics of them will be shown
//Analytics page and video management will be in different pages so will be the clip enhancement stage


//array of objects referencing 

const objectArray = [
  {
    id: 'sample',
    name: 'sample',
  },
  {
    id: 'sample1',
    name: 'sample1',
  }
]

console.log((objectArray.find((a)=>a.id === "sample"))?.id)