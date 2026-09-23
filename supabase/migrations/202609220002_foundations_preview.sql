-- Local beta preview. Human editorial approval is recorded separately before review_status becomes reviewed.
insert into public.course_versions values ('javascript-foundations-v1','JavaScript foundations','A focused introduction to values, conditions and functions. Three short lessons; not a complete JavaScript curriculum.',1,'preview');
insert into public.lessons values ('js-v1-values','javascript-foundations-v1',1,'Values and bindings','Distinguish a value from the name bound to it.','A value is data, such as the number 3 or the string "Nexus". A binding gives a value a name. Use const when the binding will not be reassigned; use let when it will.

const stops reassignment of the binding, not mutation inside an object. Here we use primitive values only. JavaScript strings use quotes. Numbers do not need quotes.

Read the example from top to bottom. The + operator adds two numbers. This lesson does not cover coercion, objects or mutation.','const minutes = 10;
const total = minutes + 5;
console.log(total); // 15',10);
insert into public.exercises values ('js-v1-values-practice','js-v1-values','practice','Which declaration allows reassignment later?','[{"id": "a", "label": "const score = 0;"}, {"id": "b", "label": "let score = 0;"}, {"id": "c", "label": "\"score = 0\";"}]');
insert into learning_private.answer_keys values ('js-v1-values-practice','b','Think about which keyword permits assigning a new value to a binding.','let allows reassignment. const does not; the quoted text is just a string.');
insert into public.exercises values ('js-v1-values-diagnostic','js-v1-values','diagnostic','What does typeof "12" produce?','[{"id": "a", "label": "\"number\""}, {"id": "b", "label": "\"string\""}, {"id": "c", "label": "\"boolean\""}]');
insert into learning_private.answer_keys values ('js-v1-values-diagnostic','b','Look at the quotation marks around 12.','"12" is quoted text, so typeof produces "string".');
insert into public.lessons values ('js-v1-conditions','javascript-foundations-v1',2,'Decisions with conditions','Trace an if/else branch using a numeric comparison.','A comparison produces a boolean: true or false. The >= operator means greater than or equal to. An if statement executes its block when its condition is truthy. Otherwise, its else block executes.

For explicit comparisons of values and types, use ===. Assignment uses = and changes a binding; it does not test equality.

Trace the comparison before choosing a branch. Only one branch of this if/else runs. This lesson uses booleans from comparisons; it does not teach every truthy or falsy value.','const minutes = 20;
if (minutes >= 15) {
  console.log("Practice");
} else {
  console.log("Review");
}',10);
insert into public.exercises values ('js-v1-conditions-practice','js-v1-conditions','practice','With minutes = 10 in the example, which message is logged?','[{"id": "a", "label": "Practice"}, {"id": "b", "label": "Review"}, {"id": "c", "label": "Both messages"}]');
insert into learning_private.answer_keys values ('js-v1-conditions-practice','b','Evaluate 10 >= 15 before selecting the branch.','10 >= 15 is false, so only the else branch logs Review.');
insert into public.exercises values ('js-v1-conditions-diagnostic','js-v1-conditions','diagnostic','What is the result of 3 === "3"?','[{"id": "a", "label": "true"}, {"id": "b", "label": "false"}, {"id": "c", "label": "It assigns 3"}]');
insert into learning_private.answer_keys values ('js-v1-conditions-diagnostic','b','Strict equality compares types as well as values.','The number 3 and the string "3" have different types, so strict equality is false.');
insert into public.lessons values ('js-v1-functions','javascript-foundations-v1',3,'Functions and return values','Follow an argument through a function to its return value.','A function packages reusable work. A parameter names the input inside the function. An argument is the value supplied when calling it.

return sends a value back to the caller and ends that function call. Logging displays a value but does not replace return. A function without a return value returns undefined.

In the example, addFive(10) returns 15, which is stored in planned. These examples are read-only; submitted JavaScript is never executed. Async functions and side effects are outside this introduction.','function addFive(minutes) {
  return minutes + 5;
}
const planned = addFive(10); // 15',10);
insert into public.exercises values ('js-v1-functions-practice','js-v1-functions','practice','What does addFive(20) return?','[{"id": "a", "label": "20"}, {"id": "b", "label": "25"}, {"id": "c", "label": "undefined"}]');
insert into learning_private.answer_keys values ('js-v1-functions-practice','b','Substitute 20 for minutes, then evaluate the returned expression.','The argument 20 becomes minutes; return sends 20 + 5, or 25, back to the caller.');
insert into public.exercises values ('js-v1-functions-diagnostic','js-v1-functions','diagnostic','Which statement sends a value back to the caller?','[{"id": "a", "label": "console.log(value);"}, {"id": "b", "label": "return value;"}, {"id": "c", "label": "const value = 1;"}]');
insert into learning_private.answer_keys values ('js-v1-functions-diagnostic','b','Displaying a value is different from returning it.','return sends the value to the caller. console.log displays it; const creates a binding.');
