// Salvaged from the original F13 flagship; author into the sports-exercise-physiology field later.
const segment = {
  id: 'sports-biomechanics',
  kind: 'branch',
  label: 'Sports Biomechanics',
  units: [
    {
      id: 'performance-mechanics',
      label: 'Performance Mechanics',
      lessons: [
        {
          id: 'biomech-sports-sprinting-mechanics',
          label: 'Sprinting Mechanics',
          readingMinutes: 5,
          sections: [
            {
              heading: 'Two phases of a sprint',
              body: 'A sprint splits mechanically into ACCELERATION (the first ~20-30m, where a sprinter is still increasing speed, using longer ground-contact times and a more forward-leaning posture to apply force at an angle that drives the body forward) and MAX-VELOCITY phase (once top speed is reached, the goal shifts to minimizing ground-contact time and maximizing stride rate/length while running nearly upright). Coaching and technique cues differ sharply between the two because the mechanical goal is different: acceleration is about horizontal force production, max velocity is about fast, efficient force application in a very short ground-contact window.',
            },
            {
              heading: 'Stride length × stride rate = speed',
              body: 'Sprint speed is mathematically the product of stride length (distance per stride) and stride rate (strides per second) — a faster sprinter has improved one or both, and biomechanics research on sprinting mostly investigates HOW to increase one without sacrificing the other, since simply overstriding (increasing length) often increases ground-contact time and reduces rate, netting little or no speed gain.',
            },
          ],
          workedExample: 'A student compares two sprinters\' 40m times, measuring both stride length (from video, using known track markings) and stride rate (steps per second) during the max-velocity phase. They find the faster sprinter does not have a dramatically longer stride, but a notably higher stride rate — correctly concluding that this athlete\'s speed advantage is driven more by rate than length, guiding a more specific technical recommendation than "just take bigger strides."',
          judgeFraming: 'Judges ask "is a speed difference driven more by stride length or stride rate?" because it is a concrete, measurable way to test whether a student\'s sprint-mechanics analysis goes beyond a single aggregate time and into the actual mechanical variables producing that time.',
          checkpoint: {
            questions: [
              {
                kind: 'mc', id: 'q1',
                prompt: 'Sprint speed is mathematically the product of:',
                options: [
                  { id: 'a', text: 'Stride length and stride rate' },
                  { id: 'b', text: 'Body weight and ground-reaction force' },
                  { id: 'c', text: 'Reaction time and stride length only' },
                  { id: 'd', text: 'Muscle mass and joint angle' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — speed equals stride length multiplied by stride rate.',
                  b: 'Body weight and GRF relate to kinetics but are not the direct formula for sprint speed.',
                  c: 'Stride rate, not just reaction time, is the other necessary factor alongside stride length.',
                  d: 'Muscle mass and joint angle can influence sprinting but are not the direct speed formula.',
                },
              },
              {
                kind: 'mc', id: 'q2',
                prompt: 'The ACCELERATION phase of a sprint is primarily characterized by:',
                options: [
                  { id: 'a', text: 'Near-upright posture and minimal ground-contact time' },
                  { id: 'b', text: 'A forward-leaning posture and longer ground-contact times to drive horizontal force' },
                  { id: 'c', text: 'Running backward' },
                  { id: 'd', text: 'No change in speed at all' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'That describes MAX-VELOCITY phase, not acceleration.',
                  b: 'Correct — acceleration favors a forward lean and longer ground contact to maximize horizontal force production.',
                  c: 'Sprinting is forward locomotion, not backward.',
                  d: 'Acceleration is specifically defined by INCREASING speed, not constant speed.',
                },
              },
              {
                kind: 'mc', id: 'q3',
                prompt: 'Simply overstriding (artificially lengthening stride) often fails to increase speed because it:',
                options: [
                  { id: 'a', text: 'Automatically increases stride rate too' },
                  { id: 'b', text: 'Often increases ground-contact time and can reduce stride rate, offsetting the length gain' },
                  { id: 'c', text: 'Has no effect on ground-contact time' },
                  { id: 'd', text: 'Is mechanically impossible' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'Overstriding does not automatically increase rate — it often works against it.',
                  b: 'Correct — overstriding often extends ground-contact time and can reduce stride rate, netting little or no real speed gain.',
                  c: 'Overstriding does affect ground-contact time, typically increasing it.',
                  d: 'Overstriding is mechanically possible; the issue is that it doesn\'t reliably improve speed.',
                },
              },
              {
                kind: 'ordering', id: 'q4',
                prompt: 'Order these sprint phases as they occur across a 100m race.',
                items: [
                  { id: 'i1', text: 'Start/reaction' },
                  { id: 'i2', text: 'Acceleration phase' },
                  { id: 'i3', text: 'Max-velocity phase' },
                  { id: 'i4', text: 'Deceleration phase (fatigue-driven speed loss)' },
                ],
                correctOrder: ['i1', 'i2', 'i3', 'i4'],
                explanation: 'A sprint begins with the start/reaction, moves through an acceleration phase building up speed, reaches a max-velocity phase, and (in a 100m race) typically ends with a fatigue-driven deceleration phase — this is the standard temporal order of race phases.',
              },
            ],
          },
        },
        {
          id: 'biomech-sports-jumping-landing-mechanics',
          label: 'Jumping and Landing Mechanics',
          readingMinutes: 5,
          sections: [
            {
              heading: 'The countermovement jump',
              body: 'A countermovement jump (crouching down before jumping up) produces a higher jump than a static squat jump (no crouch) because the rapid crouch stretches the jumping muscles under load immediately before they shorten — the "stretch-shortening cycle" — storing elastic energy in tendons (recall the earlier tendon-elasticity lesson) and enhancing the muscle\'s subsequent concentric force output, on top of the simple benefit of a longer force-application distance.',
            },
            {
              heading: 'Landing mechanics and force absorption',
              body: 'Safe landing mechanics rely on eccentric muscle control (recall the earlier eccentric-contraction lesson) at the hip, knee, and ankle to absorb landing force over a longer time and distance, rather than landing "stiff-legged," which spikes peak GRF and shifts more load onto passive structures like ligaments and cartilage. This directly connects the jumping/landing skill to the earlier fatigue-and-injury lesson: fatigued landings tend to be stiffer, which is part of why injury risk rises later in a game.',
            },
          ],
          workedExample: 'A student compares squat-jump height to countermovement-jump height in the same subjects, finding countermovement jumps average 15% higher, and explains the difference using the stretch-shortening cycle — the rapid eccentric loading of the crouch enhances the subsequent concentric push-off beyond what the same muscles could produce from a static start.',
          judgeFraming: 'Judges ask "why does a countermovement jump go higher than a static jump?" because the stretch-shortening cycle explanation ties together several concepts (eccentric contraction, tendon elasticity, force-velocity) from earlier in the Core segment, testing integrated understanding rather than an isolated fact.',
          checkpoint: {
            questions: [
              {
                kind: 'mc', id: 'q1',
                prompt: 'A countermovement jump typically produces a HIGHER jump than a static squat jump because of the:',
                options: [
                  { id: 'a', text: 'Stretch-shortening cycle — rapid eccentric loading enhances the subsequent concentric push-off' },
                  { id: 'b', text: 'Complete elimination of gravity during the crouch' },
                  { id: 'c', text: 'Reduced muscle activation during the crouch' },
                  { id: 'd', text: 'Increased body weight during the crouch' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — the rapid eccentric loading in a countermovement enhances the following concentric contraction via the stretch-shortening cycle.',
                  b: 'Gravity is never eliminated — it acts throughout the jump regardless of technique.',
                  c: 'The crouch typically involves ACTIVE eccentric muscle work, not reduced activation.',
                  d: 'Body weight does not change based on jump technique.',
                },
              },
              {
                kind: 'mc', id: 'q2',
                prompt: 'A "stiff-legged" landing (minimal joint flexion) tends to:',
                options: [
                  { id: 'a', text: 'Spread landing force over more time, reducing peak GRF' },
                  { id: 'b', text: 'Spike peak GRF and shift more load onto passive structures like ligaments' },
                  { id: 'c', text: 'Have no effect on landing forces' },
                  { id: 'd', text: 'Always be the safest landing technique' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'A stiff landing does the OPPOSITE — it shortens the force-absorption time, increasing (not reducing) peak GRF.',
                  b: 'Correct — a stiff landing concentrates force into a shorter time/distance, raising peak GRF and passive-tissue loading.',
                  c: 'Landing technique has a well-documented, significant effect on peak forces experienced.',
                  d: 'A stiff landing is generally considered LESS safe, not the safest technique, due to elevated peak forces on passive tissue.',
                },
              },
              {
                kind: 'mc', id: 'q3',
                prompt: 'Safe landing mechanics primarily rely on which type of muscle contraction to absorb force?',
                options: [
                  { id: 'a', text: 'Concentric' },
                  { id: 'b', text: 'Eccentric' },
                  { id: 'c', text: 'No muscle contraction at all' },
                  { id: 'd', text: 'Isometric only, with zero joint motion' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'Concentric (shortening) contraction is not what absorbs landing force — that requires controlled lengthening.',
                  b: 'Correct — eccentric contraction (muscles actively lengthening under load) is what controls and absorbs landing force at the joints.',
                  c: 'Active muscle work is essential to controlled landing — without it, landing would be uncontrolled.',
                  d: 'Landing involves joint flexion (motion), which rules out a purely isometric (no length change) description.',
                },
              },
              {
                kind: 'ordering', id: 'q4',
                prompt: 'Order the mechanical events of a countermovement jump.',
                items: [
                  { id: 'i1', text: 'Rapid downward crouch (eccentric loading of jumping muscles)' },
                  { id: 'i2', text: 'Elastic energy stored in tendons during the crouch' },
                  { id: 'i3', text: 'Concentric push-off, enhanced by the stored elastic energy' },
                  { id: 'i4', text: 'Takeoff' },
                ],
                correctOrder: ['i1', 'i2', 'i3', 'i4'],
                explanation: 'The crouch loads the muscles/tendons eccentrically first, which stores elastic energy, which then enhances the concentric push-off phase, culminating in takeoff — the stretch-shortening cycle requires this specific order to produce its benefit.',
              },
            ],
          },
        },
        {
          id: 'biomech-sports-throwing-mechanics',
          label: 'Throwing Mechanics',
          readingMinutes: 5,
          sections: [
            {
              heading: 'The kinetic chain',
              body: 'Overhand throwing (baseball pitch, javelin, tennis serve) is the classic example of a "kinetic chain" — a sequential transfer of energy and momentum from the ground, through the legs, hips, trunk, shoulder, elbow, and finally the hand/implement, each segment accelerating and then transferring momentum to the next in a proximal-to-distal sequence. A breakdown or mistiming anywhere in this chain (e.g., hips rotating before the trunk is ready) reduces the final velocity achievable at the hand and is a common source of both reduced performance AND elevated injury risk at the joint where the chain breaks down (very often the elbow or shoulder).',
            },
            {
              heading: 'Why the throwing arm alone is not the main power source',
              body: 'A common misconception is that arm strength alone drives throwing velocity — in reality, a large fraction of the energy delivered to a thrown object originates from lower-body and trunk rotation, sequentially passed up the kinetic chain; the arm and hand mostly deliver a final velocity boost and directional control, rather than generating the majority of the power from a standing start.',
            },
          ],
          workedExample: 'A student studying pitching velocity measures the timing of peak angular velocity at the hips, trunk, shoulder, and elbow across a single pitch. They find a clean proximal-to-distal sequence (hips peak first, then trunk, then shoulder, then elbow) in a fast pitcher, but a mistimed sequence (trunk and shoulder peaking nearly simultaneously) in a slower-throwing subject — connecting the timing breakdown directly to reduced final hand velocity via kinetic-chain theory.',
          judgeFraming: 'Judges ask students to describe the kinetic-chain sequence in their own throwing/striking movement because a correct proximal-to-distal description demonstrates real understanding of how whole-body mechanics (not isolated arm strength) drive throwing performance.',
          checkpoint: {
            questions: [
              {
                kind: 'mc', id: 'q1',
                prompt: 'The "kinetic chain" in overhand throwing describes:',
                options: [
                  { id: 'a', text: 'A sequential transfer of energy/momentum from the legs through the trunk to the arm and hand' },
                  { id: 'b', text: 'The arm acting completely independently of the rest of the body' },
                  { id: 'c', text: 'A type of muscle fiber' },
                  { id: 'd', text: 'A measurement device used in throwing research' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — the kinetic chain is the sequential, proximal-to-distal transfer of energy from the ground/legs up through the body to the throwing hand.',
                  b: 'The kinetic chain concept specifically emphasizes that the arm does NOT act independently — it depends on the sequence from the rest of the body.',
                  c: 'Kinetic chain is a mechanical/coordination concept, not a muscle fiber type.',
                  d: 'It is a biomechanical concept, not a physical measurement device.',
                },
              },
              {
                kind: 'mc', id: 'q2',
                prompt: 'A properly sequenced kinetic chain in throwing has segments reaching peak angular velocity in what order?',
                options: [
                  { id: 'a', text: 'Hand first, then elbow, then shoulder, then hips' },
                  { id: 'b', text: 'Hips first, then trunk, then shoulder, then elbow/hand (proximal to distal)' },
                  { id: 'c', text: 'All segments peak simultaneously' },
                  { id: 'd', text: 'There is no consistent order' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'This reverses the correct sequence — the chain moves proximal (hips) to distal (hand), not the other way around.',
                  b: 'Correct — a well-timed kinetic chain peaks proximal segments (hips) first, sequentially through to the most distal segment (hand) last.',
                  c: 'Simultaneous peaking is actually a sign of a MISTIMED chain, not a properly sequenced one.',
                  d: 'A proper kinetic chain follows a consistent, well-documented proximal-to-distal order.',
                },
              },
              {
                kind: 'mc', id: 'q3',
                prompt: 'A mistimed kinetic chain (e.g. trunk and shoulder peaking simultaneously instead of sequentially) is associated with:',
                options: [
                  { id: 'a', text: 'Improved velocity and no injury risk change' },
                  { id: 'b', text: 'Reduced final velocity and often elevated injury risk at the joint where the breakdown occurs' },
                  { id: 'c', text: 'No effect on either performance or injury risk' },
                  { id: 'd', text: 'Guaranteed increased velocity' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'A mistimed chain typically REDUCES velocity, not improves it, and does carry injury implications.',
                  b: 'Correct — a breakdown in the sequential chain both reduces achievable hand velocity and often raises injury risk at that breakdown point.',
                  c: 'Kinetic-chain timing has documented, measurable effects on both performance and injury risk.',
                  d: 'Mistiming is associated with REDUCED, not guaranteed increased, velocity.',
                },
              },
              {
                kind: 'ordering', id: 'q4',
                prompt: 'Order the kinetic-chain segments by when they reach peak angular velocity in a well-timed throw.',
                items: [
                  { id: 'i1', text: 'Hips' },
                  { id: 'i2', text: 'Trunk' },
                  { id: 'i3', text: 'Shoulder' },
                  { id: 'i4', text: 'Elbow/hand' },
                ],
                correctOrder: ['i1', 'i2', 'i3', 'i4'],
                explanation: 'A well-sequenced throwing kinetic chain peaks proximal segments first (hips), moving sequentially outward (trunk, then shoulder, then the most distal segment, elbow/hand) — this proximal-to-distal order is what maximizes the transferred velocity at the hand.',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'equipment-and-technique',
      label: 'Equipment & Technique',
      lessons: [
        {
          id: 'biomech-sports-footwear-surface-effects',
          label: 'Footwear and Surface Effects',
          readingMinutes: 5,
          sections: [
            {
              heading: 'Cushioning changes loading, not just comfort',
              body: 'Footwear cushioning and surface compliance change the time-course of ground-reaction force during impact (recall the earlier GRF and impulse-momentum lessons): a more compliant shoe/surface extends the effective contact time for the same change in momentum, generally reducing peak impact force — but this is a genuine mechanical trade-off, not a pure win, since some research suggests very soft/compliant conditions can also change stride mechanics (e.g., encouraging a harder initial footstrike) that partially offsets the cushioning benefit.',
            },
            {
              heading: 'Footwear can change joint-level mechanics, not just impact force',
              body: 'Beyond peak impact force, shoe design (heel-to-toe drop, sole stiffness, minimalist vs. maximalist cushioning) measurably changes joint angles and loading patterns at the ankle, knee, and hip during stance — a stiffer sole restricts ankle motion (as covered in the Core "designing an experiment" example), while a minimalist shoe tends to shift runners toward a more forefoot-first strike pattern versus a heel-first pattern in a heavily cushioned shoe.',
            },
          ],
          workedExample: 'A student compares peak vertical GRF and footstrike pattern (heel-first vs. forefoot-first, identified from video) between a maximalist cushioned shoe and a minimalist shoe in the same runners. They find the minimalist shoe shifts most subjects toward a forefoot-first strike and correctly note this is a mechanically expected interaction — a stiffer, less cushioned shoe changes the incentive to self-select a softer natural landing technique instead.',
          judgeFraming: 'Judges probe whether a student understands that footwear affects WHOLE movement mechanics (strike pattern, joint angles), not just a single peak-force number — a narrow answer citing only "the shoe absorbs shock" misses the more nuanced, more defensible mechanical story.',
          checkpoint: {
            questions: [
              {
                kind: 'mc', id: 'q1',
                prompt: 'A more compliant (cushioned) shoe or surface generally reduces peak impact force by:',
                options: [
                  { id: 'a', text: 'Extending the effective ground-contact time for the same momentum change' },
                  { id: 'b', text: 'Eliminating ground-reaction force entirely' },
                  { id: 'c', text: 'Increasing the runner\'s body weight' },
                  { id: 'd', text: 'Having no mechanical effect at all' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — more compliant materials extend contact time, spreading the same impulse over more time and lowering peak force (impulse-momentum reasoning).',
                  b: 'GRF is never eliminated by cushioning — it is present in some form on essentially any impact.',
                  c: 'Cushioning does not change a runner\'s body weight/mass.',
                  d: 'Cushioning has a real, well-documented mechanical effect on impact force timing.',
                },
              },
              {
                kind: 'mc', id: 'q2',
                prompt: 'Minimalist (less cushioned) shoes tend to shift many runners toward:',
                options: [
                  { id: 'a', text: 'A more pronounced heel-first strike pattern' },
                  { id: 'b', text: 'A more forefoot-first strike pattern' },
                  { id: 'c', text: 'No change in strike pattern whatsoever' },
                  { id: 'd', text: 'Walking instead of running' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'This is the OPPOSITE tendency — heavy cushioning, not minimalism, is more associated with heel-first striking.',
                  b: 'Correct — minimalist shoes tend to shift many runners toward a forefoot-first strike pattern.',
                  c: 'Minimalist footwear IS associated with measurable strike-pattern changes for many runners.',
                  d: 'Shoe cushioning level doesn\'t change the fundamental gait (running vs. walking).',
                },
              },
              {
                kind: 'mc', id: 'q3',
                prompt: 'Footwear\'s biomechanical effects are best described as affecting:',
                options: [
                  { id: 'a', text: 'Only peak impact force, nothing else' },
                  { id: 'b', text: 'A range of factors including strike pattern and joint-level loading/angles, not just peak impact force' },
                  { id: 'c', text: 'Nothing measurable' },
                  { id: 'd', text: 'Only the color/appearance of the runner\'s stride' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'Footwear\'s effects extend well beyond peak impact force alone — a narrow "just cushioning" answer misses this.',
                  b: 'Correct — footwear measurably affects strike pattern, joint angles, and loading distribution, not solely peak force.',
                  c: 'Footwear effects are well-documented and measurable in biomechanics research.',
                  d: 'This is not a meaningful biomechanical description of footwear\'s effects.',
                },
              },
              {
                kind: 'ordering', id: 'q4',
                prompt: 'Order the reasoning steps in a footwear-comparison study.',
                items: [
                  { id: 'i1', text: 'State a mechanism-based hypothesis about how sole stiffness/cushioning should change a specific variable' },
                  { id: 'i2', text: 'Have subjects run in each shoe condition, controlling speed/surface' },
                  { id: 'i3', text: 'Measure the target variable (e.g. GRF, strike pattern, joint angle) in each condition' },
                  { id: 'i4', text: 'Compare results across conditions and connect back to the original mechanism' },
                ],
                correctOrder: ['i1', 'i2', 'i3', 'i4'],
                explanation: 'A mechanistic hypothesis comes first, followed by controlled data collection across conditions, then measurement of the target variable, and finally comparison and interpretation tied back to the mechanism — the same experimental-design arc from the Core segment applied to a footwear question.',
              },
            ],
          },
        },
        {
          id: 'biomech-sports-technique-optimization',
          label: 'Technique Optimization',
          readingMinutes: 5,
          sections: [
            {
              heading: 'Optimizing for the actual performance goal',
              body: 'Technique "optimization" in sports biomechanics means adjusting a movement pattern to maximize (or minimize) a specific mechanical outcome relevant to performance — stride length for a long jumper, joint torque for a weightlifter, drag coefficient for a swimmer — and different sports (even different events within the same sport) can have genuinely different, sometimes opposing, optimal techniques, so "correct technique" is only meaningful relative to a specific goal.',
            },
            {
              heading: 'The trade-offs behind most technique changes',
              body: 'Most technique changes trade one mechanical variable for another — recall the sprinting lesson\'s stride-length/stride-rate trade-off, or a golf swing trading swing-plane consistency for maximum club-head speed. Sports-biomechanics research on "the best technique" almost always involves identifying and quantifying this trade-off, then determining where the optimum lies for a given athlete\'s goals and physical constraints, rather than declaring one single universally best technique.',
            },
          ],
          workedExample: 'A student studying long-jump takeoff angle notes that a higher takeoff angle increases flight time (more time in the air) but often costs horizontal takeoff velocity (energy is redirected vertically instead of horizontally) — measuring several jumpers\' takeoff angles and horizontal velocities, they identify the trade-off curve and note that elite jumpers cluster around a lower angle than physics-alone (ignoring the body\'s force-generation constraints) would suggest is "optimal," because generating enough vertical force at a high angle without losing horizontal speed is constrained by achievable leg power.',
          judgeFraming: 'Judges ask "what is being traded off in this technique change?" because identifying the specific trade-off (not just describing a technique difference) demonstrates a deeper, more defensible mechanical analysis than simply reporting "technique A is better than technique B."',
          checkpoint: {
            questions: [
              {
                kind: 'mc', id: 'q1',
                prompt: 'Technique "optimization" in sports biomechanics means:',
                options: [
                  { id: 'a', text: 'Finding one universally correct technique for every sport and athlete' },
                  { id: 'b', text: 'Adjusting movement to maximize/minimize a SPECIFIC mechanical outcome relevant to a particular performance goal' },
                  { id: 'c', text: 'Ignoring all mechanical trade-offs' },
                  { id: 'd', text: 'A purely subjective, non-measurable judgment' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'There is no single universal "correct" technique — optimization is goal-specific and can differ across sports/athletes.',
                  b: 'Correct — optimization targets a specific measurable outcome relevant to a defined performance goal.',
                  c: 'Trade-offs are usually CENTRAL to technique-optimization analysis, not something to ignore.',
                  d: 'Sports-biomechanics technique analysis is grounded in measurable mechanical variables, not pure subjectivity.',
                },
              },
              {
                kind: 'mc', id: 'q2',
                prompt: 'A higher long-jump takeoff angle tends to increase flight time but often:',
                options: [
                  { id: 'a', text: 'Also increases horizontal takeoff velocity with no cost' },
                  { id: 'b', text: 'Costs horizontal takeoff velocity, as energy is redirected more vertically' },
                  { id: 'c', text: 'Has no relationship to horizontal velocity at all' },
                  { id: 'd', text: 'Eliminates the need for any leg power' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'This ignores the real trade-off — a higher angle typically costs horizontal velocity, not gains it for free.',
                  b: 'Correct — redirecting more force vertically (higher angle) tends to reduce the horizontal velocity component, illustrating the takeoff-angle trade-off.',
                  c: 'Takeoff angle and horizontal velocity are directly, mechanically related in this trade-off.',
                  d: 'Leg power is still required to generate the force needed at any takeoff angle.',
                },
              },
              {
                kind: 'mc', id: 'q3',
                prompt: 'Why do elite long jumpers often use a LOWER takeoff angle than a simple physics-only (ignoring the body\'s constraints) model might suggest is optimal?',
                options: [
                  { id: 'a', text: 'Because generating enough vertical force at a high angle without losing horizontal speed is constrained by achievable leg power' },
                  { id: 'b', text: 'Because a lower angle is always slower in every sport' },
                  { id: 'c', text: 'Because elite jumpers ignore physics entirely' },
                  { id: 'd', text: 'Because takeoff angle has no effect on jump distance' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — real athletes are constrained by achievable leg power, which limits how much vertical force can be added at a high angle without excessive horizontal-speed loss.',
                  b: 'This is not a general truth across all sports/events — the point is a sport- and constraint-specific trade-off.',
                  c: 'Elite technique reflects real mechanical constraints, not a rejection of physics.',
                  d: 'Takeoff angle has a well-documented, significant effect on jump distance via the trade-off described.',
                },
              },
              {
                kind: 'ordering', id: 'q4',
                prompt: 'Order the analysis steps for identifying a technique trade-off.',
                items: [
                  { id: 'i1', text: 'Identify two mechanical variables that plausibly trade off against each other' },
                  { id: 'i2', text: "Measure both variables across several athletes/trials with varying technique" },
                  { id: 'i3', text: 'Plot or compare how one variable changes as the other changes' },
                  { id: 'i4', text: "Identify where the practical optimum lies given the athlete's real physical constraints" },
                ],
                correctOrder: ['i1', 'i2', 'i3', 'i4'],
                explanation: 'You must first hypothesize which two variables trade off, then gather measurements spanning a range of technique variation, then examine the relationship between them, and only then identify a realistic optimum given real-world constraints — skipping the trade-off identification step would make the later analysis directionless.',
              },
            ],
          },
        },
        {
          id: 'biomech-sports-common-injuries',
          label: 'Biomechanics of Common Sport Injuries',
          readingMinutes: 5,
          sections: [
            {
              heading: 'Connecting injury type to loading pattern',
              body: 'Different common sport injuries map onto distinct mechanical loading patterns covered earlier in this track: ACL tears are strongly associated with landing/cutting mechanics involving reduced knee flexion and high knee valgus (inward knee collapse) angles under high GRF; hamstring strains often occur during the late-swing phase of sprinting, when the hamstring is lengthening eccentrically at high velocity while decelerating the swinging leg; and stress fractures (recall the overuse-injury lesson) result from cumulative sub-maximal impact loading, common in high-mileage running.',
            },
            {
              heading: 'Why mechanism-based prevention makes sense',
              body: 'Because each injury type has an identifiable mechanical mechanism, prevention research targets that specific mechanism directly: ACL-injury-prevention programs emphasize landing technique cues that increase knee flexion and reduce valgus collapse; hamstring-injury programs emphasize eccentric strengthening (since eccentric failure under high-velocity lengthening is the proposed mechanism); this mechanism-first approach is far more effective than generic "just stretch more" advice untethered to the actual loading pattern involved.',
            },
          ],
          workedExample: 'A student researching hamstring strain prevention connects the injury mechanism (eccentric failure during high-velocity lengthening in late sprint swing phase) to a specific training intervention (eccentric hamstring strengthening, e.g. Nordic curls) and explains why this targeted approach should be more effective than generic static stretching, which does not specifically train the muscle\'s eccentric force capacity at the relevant lengths and velocities.',
          judgeFraming: 'Judges ask "what is the specific mechanical mechanism behind this injury, and does the proposed prevention strategy actually target that mechanism?" because a prevention idea disconnected from the injury\'s real mechanical cause is far weaker than one explicitly designed around it.',
          checkpoint: {
            questions: [
              {
                kind: 'mc', id: 'q1',
                prompt: 'Non-contact ACL tears are strongly associated with landing mechanics involving:',
                options: [
                  { id: 'a', text: 'Increased knee flexion and minimal knee valgus' },
                  { id: 'b', text: 'Reduced knee flexion and high knee valgus (inward collapse) under high GRF' },
                  { id: 'c', text: 'No knee motion at all' },
                  { id: 'd', text: 'Only ankle motion, with no knee involvement' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'This is the OPPOSITE pattern — increased flexion and minimal valgus are protective, not risk-associated.',
                  b: 'Correct — reduced knee flexion combined with valgus collapse under high GRF is the documented risk pattern for non-contact ACL tears.',
                  c: 'The knee is very much involved and in motion during these injury mechanisms.',
                  d: 'The knee (not just the ankle) is central to this specific injury mechanism.',
                },
              },
              {
                kind: 'mc', id: 'q2',
                prompt: 'Hamstring strains commonly occur during:',
                options: [
                  { id: 'a', text: 'Late-swing phase of sprinting, as the hamstring lengthens eccentrically at high velocity' },
                  { id: 'b', text: 'Quiet standing' },
                  { id: 'c', text: 'Slow walking only' },
                  { id: 'd', text: 'Concentric contraction at low velocity' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — late-swing high-velocity eccentric lengthening of the hamstring, decelerating the swinging leg, is the documented common mechanism.',
                  b: 'Quiet standing involves minimal hamstring loading of the type associated with strains.',
                  c: 'Slow walking does not produce the high-velocity eccentric loading associated with hamstring strains.',
                  d: 'The injury-associated mechanism is specifically ECCENTRIC and high-velocity, not concentric/low-velocity.',
                },
              },
              {
                kind: 'mc', id: 'q3',
                prompt: 'Mechanism-based injury-prevention programs (e.g., landing-technique cues for ACL, eccentric strengthening for hamstrings) are considered more effective than generic advice because they:',
                options: [
                  { id: 'a', text: 'Directly target the specific mechanical loading pattern known to cause that injury' },
                  { id: 'b', text: 'Are easier to implement, regardless of mechanism' },
                  { id: 'c', text: 'Have nothing to do with the injury\'s actual cause' },
                  { id: 'd', text: 'Work identically for every injury type' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — targeting the actual documented mechanical mechanism behind an injury makes prevention strategies more specifically effective.',
                  b: 'Ease of implementation is not the reason mechanism-based programs work better — it\'s the direct targeting of the causal mechanism.',
                  c: 'These programs are specifically designed around the KNOWN mechanical cause, not disconnected from it.',
                  d: 'Different injuries have different mechanisms, so prevention strategies are tailored per injury, not identical across all types.',
                },
              },
              {
                kind: 'matching', id: 'q4',
                prompt: 'Match each injury to its associated mechanical mechanism.',
                left: [
                  { id: 'acl', text: 'Non-contact ACL tear' },
                  { id: 'hamstring', text: 'Hamstring strain' },
                  { id: 'stress-fx', text: 'Stress fracture' },
                ],
                right: [
                  { id: 'valgus', text: 'Reduced knee flexion + valgus collapse under high GRF' },
                  { id: 'eccentric', text: 'High-velocity eccentric lengthening in late sprint swing' },
                  { id: 'cumulative', text: 'Cumulative sub-maximal repetitive impact loading' },
                ],
                correctPairs: [
                  ['acl', 'valgus'],
                  ['hamstring', 'eccentric'],
                  ['stress-fx', 'cumulative'],
                ],
                explanation: 'Each injury maps to a distinct documented mechanism: ACL tears to landing valgus/reduced flexion, hamstring strains to high-velocity eccentric lengthening, and stress fractures to cumulative repetitive sub-maximal loading — matching mechanism to injury is the basis of targeted prevention.',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'applied-analysis-sports',
      label: 'Applied Analysis',
      lessons: [
        {
          id: 'biomech-sports-video-analysis',
          label: 'Video Analysis in Sport',
          readingMinutes: 5,
          sections: [
            {
              heading: 'Building a usable video-analysis protocol',
              body: 'A rigorous student video-analysis protocol specifies, in advance: camera plane and placement (recall the anatomical-planes lesson — matched to the motion of interest), frame rate (higher rates give finer temporal resolution but require more storage/processing and, past a point, don\'t improve accuracy for slower movements), calibration (a known reference length in the frame, letting pixel measurements convert to real-world units), and a clear, repeatable definition of the exact video frame marking each event of interest (e.g., "heel strike = first frame where the heel marker touches the ground plane").',
            },
            {
              heading: 'Reliability: getting the same answer twice',
              body: 'A protocol is only useful if it is RELIABLE — if the same analyst, re-measuring the same video, gets a consistent answer (intra-rater reliability), and ideally if a second analyst gets a similar answer too (inter-rater reliability). Reporting a simple reliability check (e.g., re-measuring a subset of trials and comparing) substantially strengthens a video-analysis-based project, since it directly addresses the "how do we know this measurement is trustworthy" question a judge will otherwise have to ask.',
            },
          ],
          workedExample: 'A student defines their heel-strike event as "the first frame where the heel marker\'s vertical pixel position stops decreasing," calibrates pixel-to-meter conversion using a meter stick placed in the camera\'s field of view before recording, and re-measures 10 randomly selected trials a week later to check intra-rater reliability, finding their two measurements of the same events agree within one frame (about 17ms at 60fps) — reporting this reliability check explicitly in their methods.',
          judgeFraming: 'Judges ask "how do you know your video measurements are reliable?" because an unreported, unchecked measurement protocol is a common weak point even in otherwise strong projects, and a concrete reliability check answers the question definitively rather than leaving it to assumption.',
          checkpoint: {
            questions: [
              {
                kind: 'mc', id: 'q1',
                prompt: 'Calibrating a video-analysis setup with a known reference length in the frame allows:',
                options: [
                  { id: 'a', text: 'Converting pixel measurements into real-world units (e.g. meters)' },
                  { id: 'b', text: 'Eliminating the need for a defined frame rate' },
                  { id: 'c', text: 'Automatically fixing camera-angle foreshortening issues' },
                  { id: 'd', text: 'Measuring muscle activation' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — a known reference length lets pixel distances be converted into real-world units like meters.',
                  b: 'Frame rate is a separate, still-necessary setting — calibration doesn\'t eliminate its importance.',
                  c: 'Calibration for scale does not fix a poorly chosen camera PLANE/angle — that is a separate issue (see the earlier planes lesson).',
                  d: 'Muscle activation requires EMG, unrelated to video calibration.',
                },
              },
              {
                kind: 'mc', id: 'q2',
                prompt: 'Intra-rater reliability specifically checks whether:',
                options: [
                  { id: 'a', text: 'Two DIFFERENT analysts agree on a measurement' },
                  { id: 'b', text: 'The SAME analyst, re-measuring the same video, gets a consistent answer' },
                  { id: 'c', text: 'The camera was calibrated correctly' },
                  { id: 'd', text: 'The subject performed the movement correctly' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'Agreement between two DIFFERENT analysts is INTER-rater reliability, not intra-rater.',
                  b: 'Correct — intra-rater reliability checks the SAME analyst\'s consistency across repeated measurements of the same data.',
                  c: 'Calibration accuracy is a separate methodological check from measurement reliability.',
                  d: 'Reliability is about the MEASUREMENT process, not the subject\'s movement quality.',
                },
              },
              {
                kind: 'mc', id: 'q3',
                prompt: 'Reporting a reliability check (e.g. re-measuring a subset of trials) in a video-analysis project primarily addresses:',
                options: [
                  { id: 'a', text: 'Whether the measurements can be trusted as consistent, not just a one-off result' },
                  { id: 'b', text: 'The subject\'s athletic performance level' },
                  { id: 'c', text: 'Nothing useful — it is an unnecessary extra step' },
                  { id: 'd', text: 'The cost of the camera equipment' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — a reliability check directly answers whether the measurement process itself produces trustworthy, consistent results.',
                  b: 'Reliability checks assess the MEASUREMENT process, not the subject\'s athletic ability.',
                  c: 'Reliability checks are a standard, valuable methodological practice, not an unnecessary step.',
                  d: 'Equipment cost is unrelated to what a reliability check demonstrates.',
                },
              },
              {
                kind: 'ordering', id: 'q4',
                prompt: 'Order the steps to set up a rigorous video-analysis protocol.',
                items: [
                  { id: 'i1', text: "Choose a camera plane/placement matched to the motion of interest" },
                  { id: 'i2', text: 'Set an appropriate frame rate for the movement speed' },
                  { id: 'i3', text: 'Calibrate using a known reference length in the frame' },
                  { id: 'i4', text: 'Define a precise, repeatable rule for identifying each event of interest, then check reliability' },
                ],
                correctOrder: ['i1', 'i2', 'i3', 'i4'],
                explanation: 'Camera placement and frame rate must be decided before recording; calibration happens using footage from that same setup; and only once an event-identification rule is defined can a reliability check (re-measuring against that rule) be meaningfully performed — each step is a prerequisite for the next.',
              },
            ],
          },
        },
        {
          id: 'biomech-sports-return-to-play-metrics',
          label: 'Return-to-Play Metrics',
          readingMinutes: 5,
          sections: [
            {
              heading: 'Why "feels fine" isn\'t enough',
              body: 'After an injury, deciding when an athlete is ready to return to full sport participation increasingly relies on objective biomechanical metrics rather than subjective "how does it feel" reports, because compensatory movement patterns (the body unconsciously avoiding a previously injured area) can persist even after pain resolves, and these compensations carry elevated RE-injury risk if not detected and addressed.',
            },
            {
              heading: 'Limb symmetry as a key metric',
              body: 'A widely used return-to-play metric is the LIMB SYMMETRY INDEX — comparing a performance measure (jump height, force output, hop distance) on the previously injured limb against the uninjured limb, expressed as a percentage. A common benchmark (though sport- and injury-specific) is requiring symmetry above roughly 90% before clearing an athlete for full return, since persistent asymmetry is one of the better-established predictors of elevated re-injury risk, particularly after ACL reconstruction.',
            },
          ],
          workedExample: 'A student analyzing a mock post-ACL-reconstruction return-to-play case computes limb symmetry index for single-leg hop distance: injured-limb hop = 165cm, uninjured-limb hop = 190cm, giving a symmetry index of (165/190)×100 ≈ 87% — below the common 90% benchmark — and explains that this quantitative gap, not subjective pain reports, is the more defensible basis for a "not yet cleared" decision.',
          judgeFraming: 'Judges ask "how would you quantify readiness to return, rather than just asking if it hurts?" because relying on subjective pain reports alone misses compensatory-movement risk, and naming a specific quantitative metric (like limb symmetry index) shows real command of return-to-play biomechanics.',
          checkpoint: {
            questions: [
              {
                kind: 'mc', id: 'q1',
                prompt: 'Objective biomechanical return-to-play metrics are preferred over subjective "does it hurt" reports because:',
                options: [
                  { id: 'a', text: 'Compensatory movement patterns can persist even after pain resolves, carrying elevated re-injury risk if undetected' },
                  { id: 'b', text: 'Pain is always a perfectly reliable indicator of full mechanical recovery' },
                  { id: 'c', text: 'Objective metrics are easier to fake' },
                  { id: 'd', text: 'Subjective reports are always more accurate' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — pain can resolve while compensatory movement patterns (and their re-injury risk) persist, which is why objective metrics matter.',
                  b: 'Pain absence does not guarantee full mechanical recovery — this is exactly the gap objective metrics are meant to fill.',
                  c: 'Objective metrics are generally HARDER to game/fake than subjective self-report, not easier.',
                  d: 'Subjective reports have documented limitations for detecting compensatory mechanics, which is the whole motivation for objective metrics.',
                },
              },
              {
                kind: 'mc', id: 'q2',
                prompt: 'The Limb Symmetry Index compares:',
                options: [
                  { id: 'a', text: 'A performance measure on the injured limb versus the uninjured limb, as a percentage' },
                  { id: 'b', text: 'The athlete\'s pain level before and after surgery' },
                  { id: 'c', text: 'Two entirely different athletes' },
                  { id: 'd', text: 'Heart rate before and after exercise' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — LSI expresses a performance measure on the previously injured limb as a percentage of the same measure on the uninjured limb.',
                  b: 'LSI is a MECHANICAL performance comparison, not a pain-level comparison.',
                  c: 'LSI compares the SAME athlete\'s two limbs, not different athletes.',
                  d: 'Heart rate is unrelated to what LSI measures.',
                },
              },
              {
                kind: 'mc', id: 'q3',
                prompt: 'A limb symmetry index of 87% (below the common ~90% benchmark) would typically suggest:',
                options: [
                  { id: 'a', text: 'The athlete has fully recovered symmetric performance and should be cleared immediately' },
                  { id: 'b', text: 'A persistent asymmetry that is a documented risk factor, warranting caution before full clearance' },
                  { id: 'c', text: 'The measurement method is definitely broken' },
                  { id: 'd', text: 'Nothing meaningful — symmetry index has no established benchmarks' },
                ],
                answerId: 'b',
                explanations: {
                  a: '87% is BELOW the common ~90% benchmark, so this would not indicate full recovered symmetry.',
                  b: 'Correct — falling below the common benchmark signals a persistent asymmetry associated with elevated re-injury risk, warranting caution.',
                  c: 'A below-benchmark result is a meaningful clinical finding, not necessarily a sign of broken measurement.',
                  d: 'LSI has well-established, commonly cited benchmarks (like ~90%) used in return-to-play decisions.',
                },
              },
              {
                kind: 'ordering', id: 'q4',
                prompt: 'Order the steps to compute and interpret a limb symmetry index for single-leg hop distance.',
                items: [
                  { id: 'i1', text: 'Measure single-leg hop distance on the injured limb' },
                  { id: 'i2', text: 'Measure single-leg hop distance on the uninjured limb' },
                  { id: 'i3', text: 'Compute (injured / uninjured) × 100 as the symmetry index' },
                  { id: 'i4', text: 'Compare the result to the sport/injury-specific benchmark to inform return-to-play decisions' },
                ],
                correctOrder: ['i1', 'i2', 'i3', 'i4'],
                explanation: 'Both limb measurements must be collected before the ratio can be computed, and only after computing the index can it be meaningfully compared against a clinical benchmark to inform a return-to-play decision.',
              },
            ],
          },
        },
        {
          id: 'biomech-sports-case-study-sprinter-stride',
          label: 'Case Study: A Sprinter\'s Stride',
          readingMinutes: 6,
          sections: [
            {
              heading: 'Putting the branch together',
              body: 'This case study integrates the whole Sports Biomechanics branch into one worked analysis: a sprinter\'s coach wants to know why their athlete\'s max-velocity-phase speed has plateaued despite continued training, and asks for a biomechanical breakdown using video analysis (from the applied-analysis unit), stride-length/rate decomposition (from the performance-mechanics unit), and awareness of technique trade-offs and injury risk (from the equipment-and-technique unit).',
            },
            {
              heading: 'Working through the case',
              body: 'Video analysis (calibrated, sagittal-plane camera, reliability-checked) shows the sprinter\'s stride length is comparable to faster peers, but stride RATE is noticeably lower — pointing toward ground-contact time as the likely limiting factor. Digging further, the analysis shows longer-than-typical ground-contact time specifically during the propulsive (push-off) portion of stance, which — combined with the earlier technique-optimization lesson\'s trade-off logic — suggests technique work aimed at reducing contact time (not simply "try to run faster") is the more targeted, evidence-based recommendation than a generic strength-only intervention.',
            },
          ],
          workedExample: 'Applying the branch\'s full toolkit, a student concludes: "This sprinter\'s stride-rate deficit, not stride length, is the likely speed-limiting factor (performance-mechanics unit); it traces to elongated ground-contact time during push-off (kinetics review); a targeted contact-time-reduction technique intervention is the evidence-based recommendation (technique-optimization unit), while also monitoring for any elevated hamstring-strain risk given the sprinter\'s already-high top-end stride rate demands (common-injuries unit)."',
          judgeFraming: 'Judges use an integrated case study exactly like this one to assess whether a student can synthesize multiple concepts from across a branch into one coherent, evidence-based recommendation — rather than reciting isolated facts about sprinting, footwear, or injury independently.',
          checkpoint: {
            questions: [
              {
                kind: 'mc', id: 'q1',
                prompt: 'In the case study, the sprinter\'s speed plateau is best explained by:',
                options: [
                  { id: 'a', text: 'A stride-LENGTH deficit relative to peers' },
                  { id: 'b', text: 'A stride-RATE deficit, likely due to elongated ground-contact time during push-off' },
                  { id: 'c', text: 'Complete absence of ground-reaction force' },
                  { id: 'd', text: 'The sprinter running on the wrong surface entirely' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'The case study specifically notes stride LENGTH was comparable to peers — the deficit was in rate, not length.',
                  b: 'Correct — the analysis identifies a stride-rate deficit tied to longer-than-typical push-off ground-contact time as the likely limiting factor.',
                  c: 'GRF is always present during ground contact in running — the issue is its TIMING/duration, not its absence.',
                  d: 'The case study\'s conclusion is about contact-time technique, not surface choice.',
                },
              },
              {
                kind: 'mc', id: 'q2',
                prompt: 'Given the identified issue (long push-off contact time), the case study\'s recommended intervention is:',
                options: [
                  { id: 'a', text: 'A generic "just run faster" instruction with no technique focus' },
                  { id: 'b', text: 'A targeted technique intervention aimed at reducing ground-contact time' },
                  { id: 'c', text: 'Switching the sprinter to long-distance running' },
                  { id: 'd', text: 'No intervention at all' },
                ],
                answerId: 'b',
                explanations: {
                  a: 'A generic instruction with no specific mechanical target is exactly what this evidence-based approach avoids.',
                  b: 'Correct — the case study recommends a targeted contact-time-reduction intervention, directly tied to the identified mechanical deficit.',
                  c: 'The case study is about optimizing SPRINT performance, not switching disciplines.',
                  d: 'A specific, evidence-based intervention IS recommended based on the analysis.',
                },
              },
              {
                kind: 'mc', id: 'q3',
                prompt: 'Why does the case study also flag hamstring-strain risk monitoring alongside the technique recommendation?',
                options: [
                  { id: 'a', text: 'Because high stride-rate demands relate to the high-velocity eccentric hamstring loading covered in the common-injuries lesson' },
                  { id: 'b', text: 'Because hamstring injuries are completely unrelated to sprinting' },
                  { id: 'c', text: 'Because contact-time interventions eliminate all injury risk automatically' },
                  { id: 'd', text: 'For no particular reason — it is an arbitrary addition' },
                ],
                answerId: 'a',
                explanations: {
                  a: 'Correct — the case study explicitly connects elevated stride-rate/late-swing demands to the hamstring-strain mechanism from the common-injuries lesson, integrating branch knowledge.',
                  b: 'Hamstring strains are STRONGLY associated with sprinting, specifically the late-swing phase, as covered earlier in this branch.',
                  c: 'No single technique change eliminates all injury risk — ongoing monitoring remains warranted.',
                  d: 'The connection is a deliberate, mechanism-based integration of branch concepts, not arbitrary.',
                },
              },
              {
                kind: 'ordering', id: 'q4',
                prompt: 'Order the case-study analysis steps from first to last.',
                items: [
                  { id: 'i1', text: 'Collect calibrated, reliability-checked video of the sprint' },
                  { id: 'i2', text: 'Decompose speed into stride length and stride rate to locate the deficit' },
                  { id: 'i3', text: 'Examine ground-contact time during the relevant stance sub-phase' },
                  { id: 'i4', text: 'Recommend a targeted technique intervention and flag related injury-risk monitoring' },
                ],
                correctOrder: ['i1', 'i2', 'i3', 'i4'],
                explanation: 'Reliable video data must be collected first, then used to decompose speed into its components to locate the deficit, then examined more closely (contact time) to find the underlying mechanical cause, and only then can a targeted, evidence-based recommendation and injury-risk consideration be made.',
              },
            ],
          },
        },
      ],
    },
  ],
}
export default segment
