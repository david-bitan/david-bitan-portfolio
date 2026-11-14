// LinkedIn recommendations, quoted word for word (2026-11-12). Only edits:
// two long dashes turned into ": " / ", " (site rule, OK'd by David) and one
// typo fixed ("producr" -> "product"). `excerpt` is a verbatim cut of `text`,
// cuts marked […]. Never rephrase inside quotes. No photos: the words are
// the proof (13/11: photos added with each author's consent, supplied by David). Source for everything: LINKEDIN_RECOMMENDATIONS_URL.
export const LINKEDIN_RECOMMENDATIONS_URL =
	'https://www.linkedin.com/in/david-bitan/details/recommendations/';

export interface Testimonial {
	name: string;
	role: string;
	relation: string;
	text: string[];
	/** Round photo supplied by David (WebP, 120×120 for a 60px display). Initials until then. */
	photo?: string;
	/** Verbatim excerpt shown on the home page (featured only). */
	excerpt?: string;
	featured?: boolean;
}

export const testimonials: Testimonial[] = [
	{
		name: 'Leah Grantz',
		photo: '/recommendations/leah-grantz.webp',
		role: 'Product Manager, Ryze Beyond',
		relation: 'Worked with David on the same team',
		featured: true,
		excerpt:
			'David was quick to recognise the potential of AI and has continued to explore and integrate it into his design work. […] He’s fast, reliable, approachable and great at communicating the thinking behind his designs.',
		text: [
			'Working with people who really know their craft makes you better at yours. That’s something I appreciated about working with David at Ryze Beyond.',
			'David was quick to recognise the potential of AI and has continued to explore and integrate it into his design work. I also valued his ability to turn ideas into clean, sophisticated UI/UX designs that balanced aesthetics with usability. He’s fast, reliable, approachable and great at communicating the thinking behind his designs.',
			'David knows his craft, and it shows.',
		],
	},
	{
		name: 'Daniel Zvi',
		photo: '/recommendations/daniel-zvi.webp',
		role: 'Product Manager, Ryze Beyond',
		relation: 'Worked with David on the same team',
		featured: true,
		excerpt:
			'He’s a true professional and a perfectionist in the best sense: every design choice he makes has clear logic behind it, and he always takes the time to explain his thinking.',
		text: [
			'I had the pleasure of working alongside David at ryze, and I can’t recommend him enough. He’s a true professional and a perfectionist in the best sense: every design choice he makes has clear logic behind it, and he always takes the time to explain his thinking. Working with him meant you didn’t just get great design, you understood why it worked, and that made collaborating with him easy and genuinely valuable.',
			'He’s thoughtful, reliable, and cares deeply about getting the details right. Any team would be lucky to have him.',
		],
	},
	{
		name: 'Hadas Blitz',
		photo: '/recommendations/hadas-blitz.webp',
		role: 'Product Manager, Playright (Ryze Beyond)',
		relation: 'Worked with David on the same team',
		featured: true,
		excerpt:
			'During our four years working together at RYZE, he led the design of our gaming comparison platform, bringing authentic gaming aesthetics and visual flair to the product.',
		text: [
			'I highly recommend David as a talented and dedicated designer. During our four years working together at RYZE, he led the design of our gaming comparison platform, bringing authentic gaming aesthetics and visual flair to the product.',
			'David has a wonderful eye for detail, not only in interface design, but also in creating striking custom artwork and thematic backgrounds for major global events and seasonal campaigns.',
			'Beyond his creative skills, David is exceptionally punctual, meticulous, and deeply invested in the quality of his deliverables. He holds himself to very high standards and genuinely cares about the final product down to the finest detail. Any creative or product team would be lucky to have him.',
		],
	},
	{
		name: 'Shir Shukrun',
		photo: '/recommendations/shir-shukrun.webp',
		role: 'HRBP & Recruitment Manager, Ryze Beyond',
		relation: 'Senior to David, not his direct manager',
		text: [
			'Accompanying David’s department as their HR at Ryze Beyond for most of his nearly 7 years at the company was a true privilege, both professionally and personally.',
			'David is a rare and special combination of a top-tier professional and a person with a huge heart and remarkable emotional intelligence. Throughout his entire time with the company, he showed deep devotion, unwavering loyalty, and genuine commitment to every task and project. Beyond his professional skills, David is defined by extraordinary interpersonal relations: endless patience, an uncommon level of respect for everyone around him, and the rare ability to bring so much soul, warmth, and true human connection into the daily work.',
			'He is someone who does everything with all his heart, making him a tremendous asset to any team and company culture. I recommend David with the warmest enthusiasm and full confidence that any company fortunate enough to have him will gain a devoted partner and a truly special human being.',
		],
	},
	{
		name: 'Liska Oz',
		photo: '/recommendations/liska-oz.webp',
		role: 'Product Manager, Ryze Beyond',
		relation: 'Worked with David on the same team',
		text: [
			'I’ve had the pleasure of working with David for over six years at Ryze Beyond and it’s been a great experience.',
			'David is a talented UX/UI designer who combines creativity, professionalism, and a strong understanding of product and user experience. He always keeps up with the latest trends and technologies in the design world, including new AI tools, and is great at finding ways to incorporate them into his work.',
			'I’ve really enjoyed working with David over the years and would highly recommend him to any team looking for a skilled and forward-thinking UX/UI designer.',
		],
	},
	{
		name: 'Hagay Dubinsky',
		photo: '/recommendations/hagay-dubinsky.webp',
		role: 'UI/UX Designer, Animator & Art',
		relation: 'Worked with David at GamingTech (SBTech Group), on different teams',
		text: [
			'I’ve had the pleasure of knowing David as a close colleague in the design and product space, and I can confidently say he is a true professional with deep knowledge and extensive experience in his field.',
			'What sets David apart is his ability to balance two crucial qualities: on one hand, he is a dedicated team player who respects company standards and pays close attention to the smallest details when needed. On the other hand, he consistently looks at the bigger picture, taking a broad, systemic view of his work rather than just focusing on isolated tasks. He is always exploring new tools and workflows to optimize processes and bring real value to the organization.',
			'Beyond his professional capabilities, David is simply a wonderful person to be around. He brings a calm, friendly, and positive atmosphere to every interaction, making collaboration effortless and enjoyable. Any team would be lucky to have him.',
		],
	},
];
