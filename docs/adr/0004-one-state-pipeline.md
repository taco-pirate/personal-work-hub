# Replies and Tasks share one state pipeline

A Reply used to move from drafting to ready to sent, and a Task from open to done. The board needs one set of columns, so both kinds share Drafted, In Progress, Blocked, Ready, and Done, in that order. The user can move an item from any of those states to any other, except that a Reply with a placeholder cannot become Ready or Done. Escalated, Due, and No due are swimlanes, because they describe pressure rather than progress. Done stays on the board for the workweek it was finished, then becomes Archived, and the file stays. Drop and Defer stay outside the pipeline.

Separate lifecycles would have made the columns mean one thing for a Reply and another for a Task. Using Escalated and Due as the columns would have hidden the state.
