import { Scraper } from "agent-twitter-client";
import { validateTwitterConfig } from "./config.js";


export class AuthenticationManager {
    private static instance: AuthenticationManager;
    private scraper: Scraper;
    private cookieArray: any[];
    private cachedCookies: any;
    private isInitialized = false;

    private constructor() {
        this.scraper = new Scraper();
        this.cookieArray = [];
    }

    public static getInstance(): AuthenticationManager {
        if (!AuthenticationManager.instance) {
            AuthenticationManager.instance = new AuthenticationManager();
        }
        return AuthenticationManager.instance;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        const config = await validateTwitterConfig();
        const username = config.TWITTER_USERNAME;
        const password = config.TWITTER_PASSWORD;
        const email = config.TWITTER_EMAIL;
        let retries = config.TWITTER_RETRY_LIMIT;
        const twitter2faSecret = config.TWITTER_2FA_SECRET;

        if (!username) {
            throw new Error("Twitter username not configured");
        }

        const authToken = process.env.TWITTER_COOKIES_AUTH_TOKEN ?? "";
        const ct0 = process.env.TWITTER_COOKIES_CT0 ?? "";
        const guestId = process.env.TWITTER_COOKIES_GUEST_ID ?? "";

        const createTwitterCookies = (authToken: string, ct0: string, guestId: string) =>
            authToken && ct0 && guestId
                ? [
                    { key: 'auth_token', value: authToken, domain: '.twitter.com' },
                    { key: 'ct0', value: ct0, domain: '.twitter.com' },
                    { key: 'guest_id', value: guestId, domain: '.twitter.com' },
                ]
                : null;

        const cachedCookies = this.cookieArray || createTwitterCookies(authToken, ct0, guestId);

        if (cachedCookies) {
            console.log("[TwitterClient] Using cached cookies");
            await this.setCookiesFromArray(cachedCookies);
        }

        console.log("[TwitterClient] Waiting for Twitter login");
        while (retries > 0) {
            try {
                if (await this.scraper.isLoggedIn()) {
                    // cookies are valid, no login required
                    console.log("[TwitterClient] Successfully logged in.");
                    break;
                } else {
                    await this.scraper.login(
                        username,
                        password,
                        email,
                        twitter2faSecret
                    );
                    if (await this.scraper.isLoggedIn()) {
                        // fresh login, store new cookies
                        console.log("Successfully logged in.");
                        console.log("Caching cookies");
                        this.cachedCookies = await this.scraper.getCookies();
                        break;
                    }
                }
            } catch (error) {
                console.error(`[TwitterClient] Login attempt failed:`, error);
            }

            retries--;
            console.log(
                `[TwitterClient] Failed to login to Twitter. Retrying... (${retries} attempts left)`
            );

            if (retries === 0) {
                console.log(
                    "[TwitterClient] Max retries reached. Exiting login process."
                );
                throw new Error("[TwitterClient] Twitter login failed after maximum retries.");
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        this.isInitialized = true;
    }

    public async getScraper(): Promise<Scraper> {
        await this.initialize();
        return this.scraper;
    }

    async setCookiesFromArray(cookiesArray: any[]) {
        const cookieStrings = cookiesArray.map(
            (cookie) =>
                `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${cookie.secure ? "Secure" : ""
                }; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${cookie.sameSite || "Lax"
                }`
        );
        await this.scraper.setCookies(cookieStrings);
        this.cachedCookies = await this.scraper.getCookies();
    }
}