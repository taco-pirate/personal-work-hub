# Design

How the Personal Work Hub screens are arranged. What is owed, and how time is counted, stay in `PRODUCT.md`. The words stay in `GLOSSARY.md`.

## Shell

A sidebar and one content gutter. The sidebar is Home, Owed, and Calendar. It folds to an icon rail. This version has no inbox, projects, members, teams, or settings.

The app does not create `replies`, `tasks`, or `meetings`. The user creates those folders. The first time the app opens, the user points it at their OneDrive folder. That path sticks on this machine. It is not a sidebar item. Until a folder is chosen, the sample week shows. If the saved folder is gone, the app asks again. While a folder is in place, there is no way to switch it.

The shell, the count rows, the list and board switch, and the board are Arc components, including Arc Pro where that block is Pro. The density is a calm workspace: warm off-white, Geist, small type, one shared gutter, quiet borders. Appearance follows the system. The user can switch light or dark, and that choice sticks on this machine.

## Home

Home is the Desk. Its heading is the weekday and the date. Above the owed list, a row counts what is owed, what is Escalated, how many are Replies, how many are Tasks, and how much usable time remains this workweek. Those counts are not a score, and the row does not add a count for Blocked or In Progress. Each row shows its state and can set Drafted, In Progress, Blocked, Ready, or Done. A Reply with a placeholder cannot be set to Ready or Done. The usable gaps sit beside the list.

## Owed

Owed shows the same owed Replies and Tasks as the Desk, without the gaps. The page opens as a list, in the Desk's order, with the Desk's actions, and each row shows its state and can set it. Leaving the page and returning opens the list again. A switch turns the set into a board for that visit. The page has no count row, search, or filter.

The board columns run left to right: Drafted, In Progress, Blocked, Ready, Done. The swimlanes run top to bottom: Escalated, Due, No due. An Escalated item appears only in Escalated. Inside Due, earliest first. Inside No due, oldest first. Moving a card into a column sets that state. Dragging a card into another swimlane does not stick. The Done column shows items finished this workweek. Archived items are off the board.

## Calendar

Calendar is the week, full width. Above it, a row counts meetings still ahead, the hours those meetings take, usable time left, Focus Time left, and how many meetings are Uncategorized. Those counts are facts about the week. Each remaining workday is a column, in time order. Consuming meetings and usable gaps both appear. Personal stays outside the workday. A meeting on this page can be given another category, and that choice sticks.
