import type { ComponentResolver } from '@uni-helper/vite-plugin-uni-components'
import { kebabCase } from '@uni-helper/vite-plugin-uni-components'
export function WotResolver(): ComponentResolver { return { type:'component', resolve(name){ if(/^Wd[A-Z]/.test(name)){const c=kebabCase(name);return{name,from:`@wot-ui/ui/components/${c}/${c}.vue`}} } } }

