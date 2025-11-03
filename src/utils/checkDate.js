exports.getWeekdayName = dateInput =>
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    (d => (d instanceof Date ? d : new Date(d)).getDay())(dateInput)
    ];

