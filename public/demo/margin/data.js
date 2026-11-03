/* Margin — the handbook of Halden, a fictional 140-person design studio (Amsterdam + Lisbon).
 * Everything here is invented for a portfolio demo. Each passage has a stable id the answers cite. */
window.MARGIN_DATA = {
	company: "Halden",
	people: { team: "People Ops", email: "people@halden.example", slack: "#ask-people" },
	docs: [
		{
			id: "leave", title: "Time off", owner: "People Ops", updated: "2026-01-12", status: "current",
			summary: "Annual leave, public holidays, carry-over and how to book days off.",
			sections: [
				["P1", "Annual leave", "Everyone at Halden gets 27 days of paid annual leave per calendar year, on top of public holidays. Part-time colleagues get the same number of days pro rata."],
				["P2", "Public holidays", "We follow the public holidays of the country in your contract: the Netherlands for Amsterdam, Portugal for Lisbon. You may swap one public holiday a year for another day that matters to you."],
				["P3", "Carry-over", "You can carry up to 5 unused days into the next year. Carried-over days must be used by 31 March, after which they expire."],
				["P4", "Booking days off", "Book time off in the Hours app at least 2 weeks ahead for anything longer than 3 days. Your lead approves within 2 working days. For single days, a day's notice is fine."],
				["P5", "Unpaid leave", "After one year at Halden you can ask for up to 4 weeks of unpaid leave per year. Talk to your lead first, then People Ops confirms in writing."],
			],
		},
		{
			id: "leave-2024", title: "Time off (2024 version)", owner: "People Ops", updated: "2024-02-01", status: "superseded", supersededBy: "leave",
			summary: "The previous time-off policy. Replaced on 12 January 2026.",
			sections: [
				["P6", "Annual leave", "Everyone at Halden gets 25 days of paid annual leave per calendar year, on top of public holidays."],
				["P7", "Carry-over", "You can carry up to 3 unused days into the next year. Carried-over days must be used by 31 March."],
			],
		},
		{
			id: "remote", title: "Remote and hybrid work", owner: "People Ops", updated: "2025-09-03", status: "current",
			summary: "Office days, working from home, and working from another country.",
			sections: [
				["P8", "Office days", "Teams meet in the studio two days a week, Tuesday and Thursday. The other days you choose where you work."],
				["P9", "Working from abroad", "You can work from another country for up to 30 days per year. Ask People Ops at least 3 weeks before, because some countries need a permit even for short stays."],
				["P10", "Core hours", "Be reachable between 10:00 and 16:00 in your contract's time zone. Outside core hours, nobody expects a reply."],
				["P11", "Fully remote roles", "A few roles are fully remote by contract. Changing an existing role to fully remote needs your lead and the studio director to agree."],
			],
		},
		{
			id: "expenses", title: "Expenses", owner: "Finance", updated: "2025-11-20", status: "current",
			summary: "What you can spend on work trips, and how to get paid back.",
			sections: [
				["P12", "Meals when travelling", "On a work trip, meals are covered up to €45 per day. Alcohol is not covered, except at client dinners approved by your lead."],
				["P13", "Hotels", "Book hotels through Travelbase. The nightly cap is €160 in most cities and €220 in London, Paris, New York and Zurich."],
				["P14", "Receipts", "Upload receipts in the Tally app within 30 days. Expenses without a receipt are not refunded, except taxis under €20."],
				["P15", "Getting paid back", "Approved expenses are paid with your next salary. Anything above €1,000 needs approval from Finance before you spend it."],
				["P16", "Travel class", "Trains are preferred for trips under 6 hours. Flights are economy class, with a checked bag included for trips over 3 nights."],
			],
		},
		{
			id: "equipment", title: "Equipment and home office", owner: "IT", updated: "2025-06-15", status: "current",
			summary: "Laptops, screens and the one-off home-office budget.",
			sections: [
				["P17", "Laptops", "You get a laptop on your first day. It is replaced every 3 years, or sooner if it breaks. Personal laptops cannot be used for client work."],
				["P18", "Home-office budget", "Every new colleague gets a one-off home-office budget of €600 for a chair, desk, screen or lighting. Keep the receipts; the items are yours to keep."],
				["P19", "Screens and accessories", "The studio lends one external screen per person for home. Ask IT in #it-help; delivery takes about a week."],
				["P20", "Broken or lost equipment", "Report broken or lost equipment to IT within 24 hours. Lost laptops are wiped remotely, so report them even if you think you will find them."],
			],
		},
		{
			id: "parental", title: "Parental leave", owner: "People Ops", updated: "2025-03-10", status: "current",
			summary: "Paid leave when you have or adopt a child.",
			sections: [
				["P21", "Birth parent", "The birth parent gets 20 weeks of leave at full pay."],
				["P22", "Partner and adoptive parents", "Partners and adoptive parents get 12 weeks of leave at full pay, to take within the first year."],
				["P23", "Coming back", "You can come back part-time for the first 3 months at full pay. Agree the schedule with your lead before your leave starts."],
				["P24", "How to start", "Tell People Ops at least 10 weeks before the expected date. They prepare the paperwork for the government scheme in your country."],
			],
		},
		{
			id: "learning", title: "Learning budget", owner: "People Ops", updated: "2025-08-01", status: "current",
			summary: "Courses, books and conferences paid by the studio.",
			sections: [
				["P25", "Yearly budget", "Each person has €1,200 per year for courses, books and conferences. The budget does not roll over to the next year."],
				["P26", "Approval", "Anything above €300 needs your lead's approval in the Hours app before you book."],
				["P27", "Learning time", "You can spend 4 working hours a month on learning, booked as 'Learning' in your calendar."],
				["P28", "Conferences", "If you speak at a conference, travel and tickets are paid from the studio budget, not yours."],
			],
		},
		{
			id: "sick", title: "Sick leave and wellbeing", owner: "People Ops", updated: "2025-01-20", status: "current",
			summary: "Being ill, doctor's notes, and support when things are hard.",
			sections: [
				["P29", "Calling in sick", "Tell your lead before 10:00 on the first day, by message or phone. No reason is needed."],
				["P30", "Doctor's note", "You can self-certify for up to 3 days in a row. From the 4th day, a doctor's note is needed."],
				["P31", "Support line", "Everyone can use Openwell, a confidential support line with 6 free sessions a year with a counsellor. Halden never sees who uses it."],
				["P32", "Sick children", "If your child is ill, you can take up to 5 paid care days a year."],
			],
		},
		{
			id: "security", title: "Security basics", owner: "IT", updated: "2025-10-02", status: "current",
			summary: "Passwords, two-factor sign-in and what to do with a suspicious email.",
			sections: [
				["P33", "Passwords", "Use the studio's password manager, Vaultly, for every work account. Never reuse a password between two accounts."],
				["P34", "Two-factor sign-in", "Two-factor sign-in is required on email, Slack and Figma. Use the authenticator app, not text messages."],
				["P35", "Suspicious emails", "Do not click links in an email that looks odd. Forward it to security@halden.example and delete it. Reporting a false alarm is always fine."],
				["P36", "Client files", "Client files stay in the studio's cloud drive. Do not copy them to personal drives or USB sticks."],
			],
		},
	],
	examples: [
		"How many days off do I get?",
		"Can I work from Spain for a month?",
		"What's the hotel limit in Paris?",
		"Can I expense a gym membership?",
		"What happens to my unused days?",
		"How long is parental leave for a partner?",
	],
};
