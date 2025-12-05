import { env } from "$env/dynamic/private";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
        return {
                hostIp: env.HOST_IP || null,
        };
};
