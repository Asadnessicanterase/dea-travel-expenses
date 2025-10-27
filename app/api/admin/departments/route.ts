import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/departments - List all departments
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const departments = await prisma.department.findMany({
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
            travelRequests: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// POST /api/admin/departments - Create a new department
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, approverId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    // Check if department name already exists
    const existing = await prisma.department.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Department name already exists" },
        { status: 400 }
      );
    }

    // If approverId provided, verify the user exists and has APPROVER role
    if (approverId) {
      const approver = await prisma.user.findUnique({
        where: { id: approverId },
        select: { role: true },
      });

      if (!approver) {
        return NextResponse.json(
          { error: "Approver user not found" },
          { status: 400 }
        );
      }

      if (approver.role !== "APPROVER") {
        return NextResponse.json(
          { error: "Selected user must have APPROVER role" },
          { status: 400 }
        );
      }

      // Check if approver is already assigned to another department
      const existingDept = await prisma.department.findUnique({
        where: { approverId },
      });

      if (existingDept) {
        return NextResponse.json(
          {
            error: `This approver is already assigned to department: ${existingDept.name}`,
          },
          { status: 400 }
        );
      }
    }

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        approverId: approverId || null,
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ department });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/departments?id=xxx - Update a department
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Department ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, approverId } = body;

    const department = await prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Check if new name conflicts with existing department
    if (name && name.trim() !== department.name) {
      const existing = await prisma.department.findUnique({
        where: { name: name.trim() },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Department name already exists" },
          { status: 400 }
        );
      }
    }

    // If approverId provided, verify the user
    if (approverId !== undefined) {
      if (approverId) {
        const approver = await prisma.user.findUnique({
          where: { id: approverId },
          select: { role: true },
        });

        if (!approver) {
          return NextResponse.json(
            { error: "Approver user not found" },
            { status: 400 }
          );
        }

        if (approver.role !== "APPROVER") {
          return NextResponse.json(
            { error: "Selected user must have APPROVER role" },
            { status: 400 }
          );
        }

        // Check if approver is already assigned to another department
        const existingDept = await prisma.department.findFirst({
          where: {
            approverId,
            id: { not: id }, // Exclude current department
          },
        });

        if (existingDept) {
          return NextResponse.json(
            {
              error: `This approver is already assigned to department: ${existingDept.name}`,
            },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        approverId: approverId !== undefined ? approverId : undefined,
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ department: updated });
  } catch (error) {
    console.error("Error updating department:", error);
    return NextResponse.json(
      { error: "Failed to update department" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/departments?id=xxx - Delete a department
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Department ID is required" },
        { status: 400 }
      );
    }

    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            travelRequests: true,
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json(
        { error: "Department not found" },
        { status: 404 }
      );
    }

    // Check if department has users or travel requests
    if (department._count.users > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department with ${department._count.users} user(s). Please reassign users first.`,
        },
        { status: 400 }
      );
    }

    if (department._count.travelRequests > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete department with ${department._count.travelRequests} travel request(s).`,
        },
        { status: 400 }
      );
    }

    await prisma.department.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting department:", error);
    return NextResponse.json(
      { error: "Failed to delete department" },
      { status: 500 }
    );
  }
}
