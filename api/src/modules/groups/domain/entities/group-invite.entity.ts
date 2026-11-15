import { ConflictError } from '../../../../shared/domain/errors';
import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface GroupInviteProps {
  groupId: UniqueEntityId;
  inviterId: UniqueEntityId;
  inviteeId: UniqueEntityId;
}

/** Convite de um usuário para participar de um rolê. */
export class GroupInvite {
  private constructor(
    readonly id: UniqueEntityId,
    readonly groupId: UniqueEntityId,
    readonly inviterId: UniqueEntityId,
    readonly inviteeId: UniqueEntityId,
    private _status: InviteStatus,
    readonly createdAt: Date,
    private _respondedAt: Date | null,
  ) {}

  static create(props: GroupInviteProps, createdAt: Date, id?: UniqueEntityId): GroupInvite {
    return new GroupInvite(
      id ?? UniqueEntityId.create(),
      props.groupId,
      props.inviterId,
      props.inviteeId,
      'PENDING',
      createdAt,
      null,
    );
  }

  static restore(
    props: GroupInviteProps & {
      id: UniqueEntityId;
      status: InviteStatus;
      createdAt: Date;
      respondedAt: Date | null;
    },
  ): GroupInvite {
    return new GroupInvite(
      props.id,
      props.groupId,
      props.inviterId,
      props.inviteeId,
      props.status,
      props.createdAt,
      props.respondedAt,
    );
  }

  get status(): InviteStatus {
    return this._status;
  }

  get respondedAt(): Date | null {
    return this._respondedAt;
  }

  get isPending(): boolean {
    return this._status === 'PENDING';
  }

  accept(now: Date): void {
    this.respond('ACCEPTED', now);
  }

  decline(now: Date): void {
    this.respond('DECLINED', now);
  }

  private respond(status: InviteStatus, now: Date): void {
    if (!this.isPending) throw new ConflictError('Este convite já foi respondido');
    this._status = status;
    this._respondedAt = now;
  }
}
