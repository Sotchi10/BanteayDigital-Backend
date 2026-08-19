import bcrypt from 'bcrypt'
import prisma from '../config/database.js'
import ApiError from '../utils/api-error.js'

const PASSWORD_SALT_ROUNDS = 12

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
  const passwordMatches = user && await bcrypt.compare(password, user.passwordHash)

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email, phone number, or password')
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

export { getUserById, loginUser, registerUser, revokeUserTokens }
