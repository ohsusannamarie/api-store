// Phantombuster configuration {
"phantombuster command: nodejs"
"phantombuster package: 4"
"phantombuster dependencies: lib-StoreUtilities.js, lib-LinkedIn.js"

const Buster = require("phantombuster")
const buster = new Buster()

const Nick = require("nickjs")
const nick = new Nick({
	loadImages: true,
	userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:54.0) Gecko/20100101 Firefox/54.0",
	printPageErrors: false,
	printResourceErrors: false,
	printNavigation: false,
	printAborts: false,
})

const StoreUtilities = require("./lib-StoreUtilities")
const utils = new StoreUtilities(nick, buster)
const LinkedIn = require("./lib-LinkedIn")
const linkedIn = new LinkedIn(nick, buster, utils)
// }

// Accept all profiles visible on the page and returns an Array of added profiles.
const acceptInvites = async (tab, nbProfiles) => {
	return await tab.evaluate(function (arg, done) {
		jQuery.noConflict()
		const invites = jQuery("ul.mn-invitation-list > li").map(function (i) {
			if (i < arg.nbProfiles) {
				jQuery(this).find("input[type='checkbox']").click()
				return this.querySelector("a[data-control-name='profile']").href
			}
		})
		done(null, jQuery.makeArray(invites)) // Success
	}, { nbProfiles })
}

const loadProfilesUsingScrollDown = async (tab) => {
	utils.log("Scrolling down...", "loading")
	await tab.scrollToBottom()
	await tab.wait(3000)
	await tab.scrollToBottom()
	await tab.wait(3000)
	await tab.scrollToBottom()
	await tab.wait(3000)
}

nick.newTab().then(async (tab) => {
	const {sessionCookie, numberOfProfilesToAdd} = utils.validateArguments()

	const selectors = [ "label.invitation-card__checkbox-label", "section.mn-invitation-manager__no-invites" ]

	await linkedIn.login(tab, sessionCookie, "https://www.linkedin.com/mynetwork/invitation-manager/?filterCriteria=null")
	await tab.inject("../injectables/jquery-3.0.0.min.js")
	const selector = await tab.waitUntilVisible(selectors, 10000, "or")
	if (selector === selectors[1]) {
		utils.log("No invite to accept.", "done")
		nick.exit()
	}
	await loadProfilesUsingScrollDown(tab)
	let invites = await acceptInvites(tab, numberOfProfilesToAdd)
	await tab.click(`button[data-control-name="accept_all"]`)

	await tab.wait(2000)

	// Verbose
	utils.log(`A total of ${invites.length} profile${invites.length != 1 ? 's have' : ' has'} been added`, "done")
	for (invite of invites)
		console.log(`\t${invite}`)
	await linkedIn.saveCookie()
})
.then(() => {
	utils.log("Job done!", "done")
	nick.exit(0)
})
.catch((err) => {
	utils.log(err, "error")
	nick.exit(1)
})
