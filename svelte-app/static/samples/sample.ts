type User = {
  id: number
  name: string
}

const user: User = { id: 1, name: 'Ari' }

const formatUser = (entry: User): string => `${entry.id}-${entry.name}`

console.log(formatUser(user))
