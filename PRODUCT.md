---
description: Product rules for Personal Work Hub
alwaysApply: true
---

# Product

Personal Work Hub is the private list of what one person owes, and the usable time left to do it.

A colleague has their own hub. They run the same app against the same folder layout in their own OneDrive. They never open someone else's hub.

The words for the work live in `GLOSSARY.md`. The screens live in `DESIGN.md`. The reasons for the storage, the calendar math, the home screen, and the shared states live in `docs/adr/`.

# This version

The screens are arranged in `DESIGN.md`. Home is the Desk.

Cowork runs at 7:50, 11:50, and 3:50 in the computer's time zone on the user's workdays, and whenever the user runs it.

Each Reply, Task, and Meeting is one Markdown file in a fixed folder at the root of that person's OneDrive:

```
OneDrive/
  PersonalWorkHub/
    replies/
    tasks/
    meetings/
```

The app reads and writes that folder through a repository boundary. It does not create `PersonalWorkHub`, `replies`, `tasks`, or `meetings`. The user creates them. It does not call Microsoft Graph, so it cannot find the OneDrive root by itself. It opens the Outlook on the web address stored in the file. Cowork copies that address in. Cowork cannot delete OneDrive files, so finishing an item sets a status and leaves the file in place.

The first time the app opens, it walks the user through creating `PersonalWorkHub` at the root of their OneDrive, then `replies`, `tasks`, and `meetings` inside it, then points the app at `PersonalWorkHub`. If that folder already contains the three, the app skips the steps. Until the chosen folder is named `PersonalWorkHub` and contains all three, the sample week stays, and the app names what is missing. That path sticks on this machine. It is not a sidebar destination. The sample contains no real mail. Once the check passes, the app shows that folder, including when it has no items. If that folder is later gone, the app asks again and shows the sample week until the user chooses. While a folder is in place, this version offers no way to switch it.

# The list

The list shows owed Replies and Tasks. Done, Archived, Dropped, and Deferred items stay off it. A Deferred item returns on its date, in the state it left.

Order:

1. Escalated items.
2. Items with a Due, earliest first.
3. Items with no Due, oldest first.

Replies and Tasks share one pipeline. The states, in order, are Drafted, In Progress, Blocked, Ready, and Done. Cowork files every new Reply and every new Task as Drafted. The user may move an item to any of those states, including from Drafted straight to Ready. A Reply that still has a placeholder cannot become Ready or Done. Approve moves a Reply to Ready. Mark sent and Mark done move an item to Done.

Done items stay on the board through the workweek in which they were finished. Once a later workweek has started, the app marks those items Archived the next time it reads the folder. There is no archive page. A card can leave Done until that happens. After that, it stays Archived. The file stays. They are not deleted.

Defer asks for the date the item returns. Drop means the user will not do it. Drop is not Done. Neither Defer nor Drop is a state in the pipeline.

Only the user moves an item between those states, defers it, drops it, or dismisses Escalated. A chase does not change the state.

# Replies and tasks

A message that asks for a decision or a reply becomes one Reply. The draft is the work. Cowork writes the draft, uses a visible placeholder for any fact the user has not decided, and does not invent a date, a promise, or a fact. The user cannot approve a Reply while a placeholder remains. Cowork does not overwrite a Reply the user has edited. The user sends it from Outlook. The app does not send mail.

A message that asks for a deed and asks nothing back becomes one Task and gets no draft. The training reminder is a Task. Its action address is the learning portal when that is the one clear deed link in the email.

An email that needs both an answer and a separate deed becomes a Reply and a Task that share a Source. Finishing one does not finish the other. A later message that newly asks for an answer, such as "send the certificate," creates a Reply linked to the existing Task.

A later message that chases the same open item adds a Comment and does not create another Reply or Task. The Comment records who sent it, when, and the Outlook on the web address of that message. The same sender repeating the same Due is a Comment only. The item is Escalated when the chase moves the Due earlier, says the item is overdue or blocking someone, or comes from a different person.

Cowork sets an action address only when the email contains one link that is clearly the deed. Zero links, or several plausible ones, leave it empty. Unsubscribe, image, and tracking links are ignored. The Outlook address of the Source is never the action address.

Seeing the same email again updates the item of that kind. It does not add a second one, and it does not change the state.

# Calendar

The workday is Monday through Friday, 8:00 to 5:00, in the computer's time zone. This version has no screen to change the days, the hours, or the zone.

Cowork gives every Meeting exactly one category, using the boundaries in `GLOSSARY.md`: Operating Review, Focus Time, 1:1, Working Session, Projects, Leadership, Operational Support, or Personal. When Cowork cannot tell, the category is Uncategorized. The user's choice sticks.

Usable time is Focus Time and empty time inside the workday. Personal is outside the work day. The other categories, including Uncategorized, consume the day. Overlapping meetings count once. A consuming category wins the overlapping minutes over Focus Time. An Accepted meeting wins those minutes over a Tentative one, and the winner's category then decides. A Tentative meeting with nothing overlapping it still consumes the day by its category. A meeting the user has not answered counts as Tentative. A meeting the user organized counts as Accepted. Declined and canceled meetings do not consume time.

Teams and Outlook presence never change the day. A Busy event follows its category even when the user is the only attendee. Free and Working elsewhere stay usable even when the category is Uncategorized. An all-day event consumes the workday only when the user Accepted it and it shows as Busy or Out of office.

The gap panel shows usable gaps of at least 15 minutes from now through the last configured workday of this week, today first. It does not place work into a gap or create a calendar event. A Due with no time is the configured end time on that calendar date, including a date that is not a workday. A Due outside this workweek stays on the list, and the panel does not add that day.

# Later

These are not part of this version:

- A way to point the app at a different folder while one is already in place.
- A place to change the workday, the hours, or the zone.
- A database behind the same repository boundary.
- Cowork runs when mail or the calendar changes. The clock times remain the fallback.
- The same Reply, Task, and openable-address jobs for a Teams chat or channel message. A Teams meeting already on the calendar is a Meeting now.

# Out of this product

This version does not send mail, complete work, or put anything on the calendar by itself. It does not estimate how long a Task takes. It does not score focus blocks, track a writing profile, or present completion rates, response times, or other performance measures.
