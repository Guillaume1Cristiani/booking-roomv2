# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-09-12

### Added 🆕

- Room name next to the title of the booking
- Workaround with Firefox, you now have to use right click in order to create an event with the drag action (Left click still not supported as of right now : 1.1.0)
- Rooms 2-4, 2-3, 2-2
- Only filter one room and reset all filters
- Scrollview for the rooms in order to prevent long stretch of the window and hide the calendar
- New icon 😎

### Changed 📢

- Change filter behavior that previously made it unable to click on the div or on the switch button
- Possibility to now add 2 events that have conflictual dateStart and dateEnd (EventA books 1-8 that goes from 10:00 to 12:00, EventB books 1-8 that goes from 12:00 to 14:00)
- More security on token gestion
- No more selecting the name of the event by highlighting by mistake

## [1.0.0] - 2024-09-06

Application in production ! 🎉
