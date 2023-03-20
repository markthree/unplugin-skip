import { gray } from 'kolorist'

export function listLog(list: string[], color = gray) {
	return list.reduce((s, v, i) => {
		s += `${i === list.length - 1 ? ' └─ ' : ' ├─ '}${color(
			v
		)}${i === list.length - 1 ? '' : '\n'}`
		return s
	}, '')
}
