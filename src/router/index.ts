import {
    createRouter,
    createWebHashHistory,
} from 'vue-router'

const router = createRouter({
    history: createWebHashHistory(import.meta.env.BASE_URL),

    routes: [
        {
            path: '/',
            name: 'classe',
            component: () => import('../views/ClasseView.vue'),
        },
        {
            path: '/themes',
            name: 'themes',
            component: () => import('../views/ThemesView.vue'),
        },
        {
            path: '/suivi',
            name: 'suivi',
            component: () => import('../views/SuiviView.vue'),
        },
        {
            path: '/session',
            name: 'session',
            component: () => import('../views/SessionView.vue'),
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/',
        },
    ],
})

export default router
