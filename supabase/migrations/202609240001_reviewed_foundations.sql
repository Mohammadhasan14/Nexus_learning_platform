-- New content IDs preserve v1 enrolments, attempts, and answer meanings.
alter table public.course_versions add column supersedes_id text references public.course_versions(id);
alter table public.course_versions add constraint course_not_self_superseding check(supersedes_id is distinct from id);
alter table public.course_versions add column review_record text;
-- A version may have one direct successor; enrolments are never moved implicitly.
create unique index course_successor on public.course_versions(supersedes_id) where supersedes_id is not null;
insert into public.course_versions(id,title,summary,version,review_status,supersedes_id,review_record) values
('javascript-foundations-v2','JavaScript foundations','A three-lesson introduction to primitive values, decisions and return values. Includes six constrained checks; not a complete JavaScript curriculum.',2,'reviewed','javascript-foundations-v1','AI-assisted editorial review by Codex, 2026-09-24. Objectives, examples, six keys and feedback verified. Record: docs/PHASE_3_CONTENT_REVIEW.md. No human or independent assessment validation claimed.');
insert into public.lessons values ('js-v2-values','javascript-foundations-v2',1,'Values and bindings','Trace a numeric reassignment and distinguish a value from its type.','A value is data, such as the number 3 or the string "Nexus". A binding gives a value a name. Use const when you will not reassign that binding; use let when you will. Assignment with = stores a new value in an existing mutable binding.

const prevents reassigning the binding, not changing the contents of an object. Here we use primitive values only. Quotes make "12" a string, while 12 without quotes is a number. typeof "12" produces the string "string"; typeof 12 produces "number".

Read the example from top to bottom. Both operands of + are numbers, so they are added. After score = score + 2, the new value of score is the number 2. The earlier value is replaced, not added to a separate history. String concatenation and object mutation are outside this introduction.','let score = 0;
score = score + 2;
console.log(score); // 2',10);
insert into public.exercises values ('js-v2-values-practice','js-v2-values','practice','After let score = 0; score = score + 2;, what is the value of score?','[{"id": "a", "label": "2 (number)"}, {"id": "b", "label": "0 (number)"}, {"id": "c", "label": "\"2\" (string)"}]');
insert into learning_private.answer_keys values ('js-v2-values-practice','a','Trace both statements in order. The second assigns a numeric sum back to score.','score starts as 0. Both operands are numbers, so 0 + 2 gives the number 2, which replaces the old value of score.');
insert into public.exercises values ('js-v2-values-diagnostic','js-v2-values','diagnostic','What string does typeof "12" produce?','[{"id": "a", "label": "\"boolean\""}, {"id": "b", "label": "\"string\""}, {"id": "c", "label": "\"number\""}]');
insert into learning_private.answer_keys values ('js-v2-values-diagnostic','b','The operand has quotation marks. Distinguish its displayed characters from the type of value.','The operand "12" is a string, even though its characters look numeric. typeof therefore produces "string".');
insert into public.lessons values ('js-v2-conditions','javascript-foundations-v2',2,'Decisions with conditions','Trace an if/else branch and distinguish strict equality from assignment.','A comparison produces a boolean: true or false. The >= operator means greater than or equal to. An if statement executes its block when its condition is truthy; otherwise its else block executes. In this lesson all conditions are explicit boolean comparisons.

Use === to test strict equality. If the operands have different types, the result is false: 3 === "3" is false because a number and a string are different types. Assignment uses =; it does not test equality.

Trace the comparison before choosing a branch. With minutes = 20, the example prints Practice. With minutes = 10, the comparison 10 >= 15 is false, so only Review is printed. This introduction does not cover every truthy/falsy value or every numeric equality edge case.','const minutes = 20;
if (minutes >= 15) {
  console.log("Practice");
} else {
  console.log("Review");
}',10);
insert into public.exercises values ('js-v2-conditions-practice','js-v2-conditions','practice','With minutes = 10 in the example, which message is logged?','[{"id": "a", "label": "Practice"}, {"id": "b", "label": "Both messages"}, {"id": "c", "label": "Review"}]');
insert into learning_private.answer_keys values ('js-v2-conditions-practice','c','Evaluate 10 >= 15 first. An if/else chooses one of these two blocks.','10 >= 15 is false, so the else block runs and logs Review. The Practice block does not run.');
insert into public.exercises values ('js-v2-conditions-diagnostic','js-v2-conditions','diagnostic','What is the result of 3 === "3"?','[{"id": "a", "label": "false"}, {"id": "b", "label": "true"}, {"id": "c", "label": "A TypeError"}]');
insert into learning_private.answer_keys values ('js-v2-conditions-diagnostic','a','Check the types before comparing the displayed characters. Strict equality does not convert strings to numbers.','The operands have different types, so strict equality returns false. Comparing these types with === does not throw an error.');
insert into public.lessons values ('js-v2-functions','javascript-foundations-v2',3,'Functions and return values','Follow arguments into a function and distinguish returning a value from logging it.','A function packages reusable work. A parameter names an input inside the function. An argument is the value supplied when calling it. Each call to addFive gives minutes the supplied argument.

return sends a value back to the caller and ends that function call. console.log displays a value; it does not make an enclosing function return that value. An ordinary function that reaches its end without returning a value returns undefined, not null.

In the example, addFive(10) returns 15, which is stored in planned. A function containing only console.log("Ready") displays Ready but its caller receives undefined. These examples are read-only. Submitted JavaScript is never executed. Async functions and generators are outside this introduction.','function addFive(minutes) {
  return minutes + 5;
}
const planned = addFive(10); // 15',10);
insert into public.exercises values ('js-v2-functions-practice','js-v2-functions','practice','What does addFive(20) return?','[{"id": "a", "label": "20"}, {"id": "b", "label": "25"}, {"id": "c", "label": "undefined"}]');
insert into learning_private.answer_keys values ('js-v2-functions-practice','b','Substitute 20 for the parameter minutes, then follow the return expression.','minutes receives 20, so return sends 20 + 5, or 25, to the caller.');
insert into public.exercises values ('js-v2-functions-diagnostic','js-v2-functions','diagnostic','An ordinary function contains only console.log("Ready"); and no return statement. What value does calling it return?','[{"id": "a", "label": "\"Ready\""}, {"id": "b", "label": "null"}, {"id": "c", "label": "undefined"}]');
insert into learning_private.answer_keys values ('js-v2-functions-diagnostic','c','Separate the console output from the value returned by the function call.','The call logs Ready, but the function reaches its end without returning a value. Its return value is undefined, not the logged string or null.');
