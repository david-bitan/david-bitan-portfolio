/* Otium — demo inventory. Every name, flight and price here is fictional
 * and simulated; nothing is ever booked or charged. Prices are per person
 * for flights and per night for stays, in EUR. */
window.OTIUM_DATA = {
	origins: [["Paris", "CDG"], ["London", "LHR"], ["Tel Aviv", "TLV"], ["Berlin", "BER"], ["Madrid", "MAD"], ["Brussels", "BRU"], ["Dublin", "DUB"], ["Geneva", "GVA"], ["Lyon", "LYS"], ["Milan", "MXP"], ["Munich", "MUC"], ["Vienna", "VIE"]],
	cities: {
		lisbon: {
			name: "Lisbon", code: "LIS", country: "Portugal", photo: "media/lisbon.jpg",
			tagline: "Tiled hills, river light, late dinners.",
			flight: { base: 128, hours: "2h 40" },
			stays: [
				{ id: "lx1", name: "Casa do Miradouro", area: "Alfama", nightly: 148, rating: 4.8, perk: "Rooftop over the river", freeCancel: true, photo: "media/stay-1.jpg" },
				{ id: "lx2", name: "Rua Nova Rooms", area: "Baixa", nightly: 109, rating: 4.6, perk: "Walk to everything", freeCancel: true, photo: "media/stay-2.jpg" },
				{ id: "lx3", name: "Atelier Belém", area: "Belém", nightly: 196, rating: 4.9, perk: "Design suites, quiet garden", freeCancel: false, photo: "media/stay-3.jpg" },
			],
			days: [
				["Tram up to the castle viewpoints", "Seafood lunch in Cais do Sodré", "Sunset at a miradouro"],
				["Tile museum, slow morning", "Pastry stop in Belém", "Fado in an Alfama tavern"],
				["Day trip by train to Sintra", "Palace gardens", "Back for dinner in Príncipe Real"],
				["Market brunch", "Riverside bike path", "Farewell dinner"],
			],
		},
		rome: {
			name: "Rome", code: "FCO", country: "Italy", photo: "media/rome.jpg",
			tagline: "Ruins at breakfast, gelato at midnight.",
			flight: { base: 142, hours: "2h 10" },
			stays: [
				{ id: "ro1", name: "Palazzo Rione", area: "Monti", nightly: 172, rating: 4.7, perk: "Five minutes from the Forum", freeCancel: true, photo: "media/stay-1.jpg" },
				{ id: "ro2", name: "Trastevere Courtyard", area: "Trastevere", nightly: 131, rating: 4.6, perk: "Quiet inner garden", freeCancel: true, photo: "media/stay-2.jpg" },
				{ id: "ro3", name: "Villa Aventina", area: "Aventine", nightly: 238, rating: 4.9, perk: "Terrace, city views", freeCancel: false, photo: "media/stay-3.jpg" },
			],
			days: [
				["Colosseum, timed early entry", "Lunch in Monti", "Evening walk to the Trevi fountain"],
				["Vatican museums", "Long lunch near Prati", "Aperitivo in Trastevere"],
				["Borghese gardens", "Pantheon & piazzas", "Pasta class (simulated booking)"],
				["Campo de' Fiori market", "Appian Way by bike", "Farewell dinner"],
			],
		},
		barcelona: {
			name: "Barcelona", code: "BCN", country: "Spain", photo: "media/barcelona.jpg",
			tagline: "Beach mornings, Gaudí afternoons.",
			flight: { base: 104, hours: "1h 55" },
			stays: [
				{ id: "bc1", name: "Casa Eixample", area: "Eixample", nightly: 158, rating: 4.7, perk: "Modernist building, big windows", freeCancel: true, photo: "media/stay-1.jpg" },
				{ id: "bc2", name: "Born Lofts", area: "El Born", nightly: 122, rating: 4.5, perk: "Old town, tapas downstairs", freeCancel: true, photo: "media/stay-2.jpg" },
				{ id: "bc3", name: "Mar Bella House", area: "Poblenou", nightly: 209, rating: 4.8, perk: "Two blocks from the beach", freeCancel: false, photo: "media/stay-3.jpg" },
			],
			days: [
				["Sagrada Família, timed entry", "Lunch in Gràcia", "Bunkers del Carmel at sunset"],
				["Gothic quarter walk", "Boqueria market", "Tapas crawl in El Born"],
				["Park Güell", "Beach afternoon", "Seafood dinner in Barceloneta"],
				["Montjuïc by cable car", "Joan Miró foundation", "Farewell dinner"],
			],
		},
		amsterdam: {
			name: "Amsterdam", code: "AMS", country: "Netherlands", photo: "media/amsterdam.jpg",
			tagline: "Canals, bikes, golden-hour gables.",
			flight: { base: 96, hours: "1h 25" },
			stays: [
				{ id: "am1", name: "Canal House 17", area: "Jordaan", nightly: 184, rating: 4.8, perk: "Canal-view rooms", freeCancel: true, photo: "media/stay-1.jpg" },
				{ id: "am2", name: "De Pijp Studios", area: "De Pijp", nightly: 139, rating: 4.5, perk: "Next to the street market", freeCancel: true, photo: "media/stay-2.jpg" },
				{ id: "am3", name: "Harbour Loft", area: "Eastern Docklands", nightly: 221, rating: 4.9, perk: "Waterfront, bikes included", freeCancel: false, photo: "media/stay-3.jpg" },
			],
			days: [
				["Canal boat tour", "Lunch in the Jordaan", "Brown café evening"],
				["Rijksmuseum", "Vondelpark picnic", "Dinner in De Pijp"],
				["Bike to the windmills", "Cheese farm stop", "Back for a canal-side dinner"],
				["Flower market", "NDSM wharf by ferry", "Farewell dinner"],
			],
		},
		athens: {
			name: "Athens", code: "ATH", country: "Greece", photo: "media/athens.jpg",
			tagline: "Marble, rooftops and long summer nights.",
			flight: { base: 118, hours: "3h 15" },
			stays: [
				{ id: "at1", name: "Plaka Terrace Suites", area: "Plaka", nightly: 141, rating: 4.7, perk: "Acropolis-view terrace", freeCancel: true, photo: "media/stay-1.jpg" },
				{ id: "at2", name: "Koukaki Rooms", area: "Koukaki", nightly: 98, rating: 4.6, perk: "Local cafés, quiet streets", freeCancel: true, photo: "media/stay-2.jpg" },
				{ id: "at3", name: "Riviera Blue", area: "Vouliagmeni", nightly: 214, rating: 4.9, perk: "On the coast, 30 min out", freeCancel: false, photo: "media/stay-3.jpg" },
			],
			days: [
				["Acropolis at opening", "Lunch in Plaka", "Rooftop dinner, temple lit up"],
				["Acropolis museum", "Central market", "Evening in Psyrri"],
				["Coastal drive to Sounion", "Swim stop", "Sunset at the temple of Poseidon"],
				["National garden", "Lycabettus hill", "Farewell dinner"],
			],
		},
		copenhagen: {
			name: "Copenhagen", code: "CPH", country: "Denmark", photo: "media/copenhagen.jpg",
			tagline: "Harbour swims, bakeries, bikes everywhere.",
			flight: { base: 112, hours: "1h 50" },
			stays: [
				{ id: "cp1", name: "Nyhavn Quarters", area: "Nyhavn", nightly: 205, rating: 4.7, perk: "On the colourful harbour", freeCancel: true, photo: "media/stay-1.jpg" },
				{ id: "cp2", name: "Vesterbro Hus", area: "Vesterbro", nightly: 151, rating: 4.5, perk: "Meatpacking district dining", freeCancel: true, photo: "media/stay-2.jpg" },
				{ id: "cp3", name: "Islands Brygge Lofts", area: "Islands Brygge", nightly: 239, rating: 4.9, perk: "Harbour bath at the door", freeCancel: false, photo: "media/stay-3.jpg" },
			],
			days: [
				["Harbour boat tour", "Smørrebrød lunch", "Tivoli gardens at night"],
				["Bike through Christianshavn", "Street food on Refshaleøen", "Harbour swim"],
				["Louisiana museum by train", "Coastal walk", "New Nordic dinner"],
				["Bakery crawl", "Design museum", "Farewell dinner"],
			],
		},
	},
	airlines: ["Aerolume", "Skyra", "Northwind"],
	departures: [["07:10", "Direct"], ["11:45", "Direct"], ["18:30", "1 stop"]],
};
