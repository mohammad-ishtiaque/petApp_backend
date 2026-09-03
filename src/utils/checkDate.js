exports.getWeekdayName = dateInput =>
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    (d => (d instanceof Date ? d : new Date(d)).getDay())(dateInput)
    ];

exports.combineDateAndTime = (dateObj, timeStr) => {
    if (!dateObj) return null;
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return null;

    let hours = 23;
    let minutes = 59;

    if (timeStr && typeof timeStr === 'string') {
        const str = timeStr.trim();
        const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        const match24 = str.match(/^(\d{1,2}):(\d{2})$/);

        if (match12) {
            hours = parseInt(match12[1], 10);
            minutes = parseInt(match12[2], 10);
            const meridiem = match12[3].toUpperCase();
            if (meridiem === 'PM' && hours < 12) hours += 12;
            if (meridiem === 'AM' && hours === 12) hours = 0;
        } else if (match24) {
            hours = parseInt(match24[1], 10);
            minutes = parseInt(match24[2], 10);
        }
    }

    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0);
};


