## Robotics & Control — subtype emphasis

Beyond the base engineering rubric, hold a robotics plan to these specifics:

- **Actuation:** Are motor types justified (DC vs. stepper vs. servo vs. BLDC)
  against torque/speed needs? Is **stall/operating current draw** estimated and
  matched to the driver and power budget?
- **Power:** Is **battery chemistry/capacity** chosen with an explicit **runtime**
  estimate from the current budget? Voltage regulation considered?
- **Control:** Is the control strategy stated (open-loop vs. PID/feedback)? What
  sensors close the loop, and at what update rate?
- **Mechanics:** Are degrees of freedom, gearing, and load/weight budgeted?
- **Testing:** Quantitative metrics — accuracy/repeatability, settling time,
  payload, success rate over **many trials** and varied conditions — not a single
  demo. Reward a bench-test plan that isolates subsystems before integration.
