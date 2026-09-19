import bcrypt from 'bcrypt'
import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const PASSWORD_SALT_ROUNDS = 12
// A valid bcrypt hash used to keep failed-login work comparable when the
// supplied account does not exist. It is never associated with a real user.
const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5hQ0tQ0CNS1L2.s.6QIML.n7RtA.0wK'

const registerUser = async ({ email, password, name, phoneNumber, age }) => {
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS)

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, name, phone_num: phoneNumber, age },
    })

    return user
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(409, 'An account with that email or phone number already exists')
    }

    throw error
  }
}

const loginUser = async ({ email, phoneNumber, password }) => {
  const contactFilters = [
    email && { email },
    phoneNumber && { phone_num: phoneNumber },
  ].filter(Boolean)
  const user = await prisma.user.findFirst({
    where: { OR: contactFilters },
  })
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash || DUMMY_PASSWORD_HASH)

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email, phone number, or password')
  }

  if (user.status === 'BANNED') {
    throw new ApiError(403, 'This account has been banned due to security violations')
  }

  if (user.status === 'SUSPENDED') {
    throw new ApiError(403, 'This account has been temporarily suspended')
  }

  return user
}

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } })

  if (!user) {
    throw new ApiError(401, 'User account no longer exists')
  }

  return user
}

const revokeUserTokens = async (id) => {
  await prisma.user.update({
    where: { id },
    data: { tokenVersion: { increment: 1 } },
  })
}

const updateUserProfile = async (id, profile) => {
  try {
    return await prisma.user.update({
      where: { id },
      data: profile,
    })
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'That email address or username is already in use')
    throw error
  }
}

export { getUserById, loginUser, registerUser, revokeUserTokens, updateUserProfile }
