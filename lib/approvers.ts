import { prisma } from "./db";
import { User, UserRole } from "@prisma/client";

/**
 * Get the approver for a specific department, or the global approver as fallback
 * @param departmentId - Optional department ID
 * @returns User object of the approver, or null if none found
 */
export async function getApproverForDepartment(
  departmentId?: string | null
): Promise<User | null> {
  try {
    // If department is specified, find the department's approver
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
        include: {
          approver: true,
        },
      });

      if (department?.approver) {
        return department.approver;
      }
    }

    // Fallback: Find first user with APPROVER role (global approver)
    const globalApprover = await prisma.user.findFirst({
      where: {
        role: UserRole.APPROVER,
        departmentId: null, // Prioritize approvers without a department
      },
    });

    if (globalApprover) {
      return globalApprover;
    }

    // Last resort: Any user with APPROVER role
    return await prisma.user.findFirst({
      where: { role: UserRole.APPROVER },
    });
  } catch (error) {
    console.error("Error finding approver:", error);
    return null;
  }
}

/**
 * Get the approver's email for a specific department
 * @param departmentId - Optional department ID
 * @returns Email address or null
 */
export async function getApproverEmail(
  departmentId?: string | null
): Promise<string | null> {
  const approver = await getApproverForDepartment(departmentId);
  return approver?.email || null;
}

/**
 * Check if a user can approve a request based on their role and department
 * @param userId - User ID to check
 * @param requestDepartmentId - Department ID of the request (optional)
 * @returns true if user can approve, false otherwise
 */
export async function canUserApprove(
  userId: string,
  requestDepartmentId?: string | null
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        approverForDepartment: true,
      },
    });

    if (!user) {
      return false;
    }

    // Admins can approve everything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // User must have APPROVER role
    if (user.role !== UserRole.APPROVER) {
      return false;
    }

    // If the approver has a department assigned, they can only approve their department's requests
    if (user.approverForDepartment) {
      return user.approverForDepartment.id === requestDepartmentId;
    }

    // If approver has no department, they can only approve requests without departments (global approver)
    return !requestDepartmentId;
  } catch (error) {
    console.error("Error checking approval permissions:", error);
    return false;
  }
}

/**
 * Get all requests that a user can approve based on their role and department
 * Returns filter conditions for Prisma queries
 */
export async function getApprovalFilter(userId: string): Promise<any> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        approverForDepartment: true,
      },
    });

    if (!user) {
      return { id: "never-match" }; // Return impossible condition
    }

    // Admins see everything
    if (user.role === UserRole.ADMIN) {
      return {}; // No filter = see all
    }

    // Non-approvers see nothing in approvals view
    if (user.role !== UserRole.APPROVER) {
      return { id: "never-match" };
    }

    // If approver has a department, filter by that department
    if (user.approverForDepartment) {
      return { departmentId: user.approverForDepartment.id };
    }

    // If approver has no department (global approver), show only requests without departments
    return { departmentId: null };
  } catch (error) {
    console.error("Error getting approval filter:", error);
    return { id: "never-match" };
  }
}

/**
 * Check if user has approver or admin role
 * @param userId - User ID to check
 * @returns true if user is approver or admin
 */
export async function isApproverOrAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return (
      user?.role === UserRole.APPROVER || user?.role === UserRole.ADMIN
    );
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}
