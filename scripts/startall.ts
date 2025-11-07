//generate a script to configure start all
//first index will be the first to start, then comes to the next

const samplejobs = [
  {
    id: "1",
    name: "job1",
    status: "completed",
  },
  {
    id: "2",
    name: "job2",
    status: "ready",
  },
  {
    id: "3",
    name: "job3",
    status: "ready",
  },
  {
    id: "4",
    name: "job4",
    status: "ready",
  },
  {
    id: "5",
    name: "job5",
    status: "ready",
  },
  {
    id: "6",
    name: "job6",
    status: "ready",
  },
  {
    id: "7",
    name: "job7",
    status: "completed",
  },
];


//second approach to bypass await function
//updating of all the ready status into a queued status
for (let x = 0; x < samplejobs.length; x++) {
  //dummy updates
  if (samplejobs[x].status === "ready") {
    samplejobs[x].status = "queued";
    // for (let y = 0; y < samplejobs.length; y++) {
    //   if (y != x && samplejobs[y].status === "ready") {
    //     samplejobs[y].status = "queued";
    //   }
    // }
    // console.log("Jobs after processing update: ", samplejobs);
    // samplejobs[x].status = "completed";
  }
}

//then the actual starting per queued will happen
for (let y = 0; y < samplejobs.length; y++) {
    // const element = samplejobs[y];
     
    
}





//not applicable when there is am awaiting process, instead update all of the ready first into a queued status

console.log("After updating all ready status: ", samplejobs);
