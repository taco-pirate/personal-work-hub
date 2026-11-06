# Design

How the Personal Work Hub screens are arranged. What is owed, and how time is counted, stay in `PRODUCT.md`. The words stay in `GLOSSARY.md`.

## Shell

A sidebar and one content gutter. The sidebar is Home, Owed, and Calendar. It folds to an icon rail. This version has no inbox, projects, members, teams, or settings.

The app does not create `PersonalWorkHub`, `replies`, `tasks`, or `meetings`. The first open walks the user through creating `PersonalWorkHub` at the root of their OneDrive, then those three folders inside it, then selecting `PersonalWorkHub`. If the three folders are already there, the steps are skipped. Until that check passes, the sample week shows, and the app names what is missing. The path sticks on this machine. It is not a sidebar item. If the saved folder is gone, the app asks again. While a folder is in place, there is no way to switch it.

The shell, the count rows, the list and board switch, and the board are Arc components, including Arc Pro where that block is Pro. The density is a calm workspace: warm off-white, Geist, small type, one shared gutter, quiet borders. Appearance follows the system. The user can switch light or dark, and that choice sticks on this machine.

## Home

Home is the Desk. Its heading is the weekday and the date. Above the owed list, a row counts what is owed, what is Escalated, how many are Replies, how many are Tasks, and how much usable time remains this workweek. Those counts are not a score, and the row does not add a count for Blocked or In Progress. The owed work sits in quiet cards beside the usable gaps. A card shows the kind, the title, the Due, and Escalated. It does not carry the draft, the state control, who it is from, Defer, Drop, or Dismiss. The whole card opens the record.

## Owed

Owed shows the same owed Replies and Tasks as the Desk, without the gaps. The page opens as a list, in the Desk's order. Leaving the page and returning opens the list again. A switch turns the set into a board for that visit. The page has no count row, search, filter, or column picker.

A row shows the kind, the title, the state, the Due, who it is from, and whether it is Escalated. The row does not edit the item. Opening a row opens its record.

The board columns run left to right: Drafted, In Progress, Blocked, Ready, Done. The swimlanes run top to bottom: Escalated, Due, No due. An Escalated item appears only in Escalated. Inside Due, earliest first. Inside No due, oldest first. Moving a card into a column sets that state. Dragging a card into another swimlane does not stick. A board card shows the kind, the title, the Due, and Escalated. It does not carry the draft, Defer, Drop, or Dismiss. The whole card opens the record. The Done column shows items finished this workweek. Archived items are off the board.

## Record

A Reply and a Task each open as a record. There is no record number, priority, assignment, or caller. Each has its own address. Opening it adds a step in the browser's history. Refresh stays on that record. Copying the address opens it. The Back control on the page and the browser's Back button are the same step. Back returns to the Desk, the list, the board, or the calendar, whichever was showing.

The list and the board have their own addresses, so a record opened from the board returns to the board. Choosing Owed in the sidebar opens the list.

An address opens the record when the item is Done, Deferred, Dropped, or Archived, and the page shows that state. Archived cannot be moved back. A Dropped record stays off the lists. A Deferred record shows the date it returns.

The record is one column. The header is the title and the state. Under that: the body, then the source, then the activity. The source shows who it is from, the Due, the Outlook address, and the action address. The activity is the Comments already on the item. There is no box for a new note. Another Reply or Task that shares the Source is listed under the activity. Defer, Drop, and Dismiss sit with the state. A Reply with a placeholder still cannot become Ready or Done.

Anything not on the record stays quiet. The Desk, the Owed rows, and the board cards do not carry the draft or those actions.

## Calendar

Calendar is the week, full width. Above it, a row counts meetings still ahead, the hours those meetings take, usable time left, Focus Time left, and how many meetings are Uncategorized. Those counts are facts about the week. Each remaining workday is a column, in time order. Consuming meetings and usable gaps both appear. Personal stays outside the workday.

A meeting block shows the time, the title, and the category. The whole block opens the meeting record. That record shows the title, the category, the time, and the Outlook address. The category is changed there, and the choice sticks. There is no draft, Defer, or Drop. The meeting's address works the same way as a Reply or a Task.
